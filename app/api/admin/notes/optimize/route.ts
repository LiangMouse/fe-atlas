import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import {
  optimizeNoteInputSchema,
  optimizeNoteOutputSchema,
} from "@/lib/admin-schemas";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { logAdminAction, logServerError } from "@/lib/logger";
import { ensureValidNoteSlug } from "@/lib/note-route";
import { NOTE_TYPES } from "@/lib/note-types";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_MODEL = "gemini-3-flash-preview";

const SYSTEM_PROMPT = `你是资深前端面试知识库编辑。请把管理员输入的模糊草稿整理成可发布的八股文内容。
必须遵循：
0) 角色设定: 你是经验丰富的大厂高P前端面试候选,精通任何前端问题,能够用面试官的视角去思考问题。分点回答,条理清晰,切中要点。
1) 仅输出 JSON 对象，不要 markdown 代码块，不要任何额外说明文本。
2) JSON 字段必须且仅包含：noteType, tags, memoryVersion, detailedVersion。
3) noteType 必须从以下枚举中选择一个：${NOTE_TYPES.join("、")}, 且选择最吻合的, 完全不清楚才选择综合。
4) tags：3-6 个中文/英文技术标签，去重，不要空字符串。
5) memoryVersion：便于记忆的简要版本（要点清单），要求精炼、可背诵、覆盖高频面试点。
6) detailedVersion：便于理解的扩展版本，要求解释清楚原理、边界和实战取舍。
7) memoryVersion 与 detailedVersion 都必须是 Markdown。
8) 面向前端面试复习，给出可执行建议，避免空话和泛泛定义。
9) 可包含简短代码片段，但不要冗长。
`;

const NOTE_JSON_SCHEMA = {
  type: "object",
  required: ["noteType", "tags", "memoryVersion", "detailedVersion"],
  additionalProperties: false,
  properties: {
    noteType: { type: "string", enum: NOTE_TYPES },
    tags: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string", minLength: 1 },
    },
    memoryVersion: { type: "string", minLength: 20 },
    detailedVersion: { type: "string", minLength: 40 },
  },
} as const;

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  text?: string;
  candidates?: GeminiCandidate[];
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableGeminiError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("503") ||
    message.includes("429") ||
    message.includes("unavailable") ||
    message.includes("timeout") ||
    message.includes("overloaded") ||
    message.includes("rate limit")
  );
}

async function generateContentWithRetry({
  ai,
  model,
  contents,
  maxRetries = 1,
}: {
  ai: GoogleGenAI;
  model: string;
  contents: {
    role: string;
    parts: { text: string }[];
  }[];
  maxRetries?: number;
}) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: NOTE_JSON_SCHEMA,
          temperature: 0.15,
          maxOutputTokens: 3072,
        },
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === maxRetries) {
        throw error;
      }

      await sleep(700 * 2 ** attempt);
    }
  }

  throw lastError;
}

function parseGeminiText(response: GeminiResponse) {
  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function toJsonString(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function extractFirstJsonObject(raw: string) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) {
        start = i;
      }
      depth += 1;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          return raw.slice(start, i + 1);
        }
      }
    }
  }

  return null;
}

function parseStructuredJson(rawText: string) {
  const direct = toJsonString(rawText);
  const fromRaw = extractFirstJsonObject(rawText);
  const fromDirect = extractFirstJsonObject(direct);
  const candidates = [direct, fromRaw, fromDirect].filter(Boolean) as string[];

  for (const item of candidates) {
    try {
      return JSON.parse(item) as unknown;
    } catch {
      // continue
    }
  }

  return null;
}

function normalizeNoteType(input: unknown) {
  if (typeof input !== "string") return "综合";
  const raw = input.trim();
  if (NOTE_TYPES.includes(raw as (typeof NOTE_TYPES)[number])) {
    return raw;
  }

  const lower = raw.toLowerCase();
  if (/(^|\b)(js|javascript|ecmascript)(\b|$)/.test(lower)) return "JavaScript";
  if (/(^|\b)(ts|typescript)(\b|$)/.test(lower)) return "TypeScript";
  if (lower.includes("react")) return "React";
  if (lower.includes("vue")) return "Vue";
  if (/(^|\b)(css|scss|less|style|styles)(\b|$)/.test(lower) || raw.includes("样式")) return "CSS";
  if (lower.includes("browser") || raw.includes("浏览器") || raw.includes("dom") || raw.includes("bom")) {
    return "浏览器";
  }
  if (
    lower.includes("network") ||
    raw.includes("网络") ||
    lower.includes("http") ||
    lower.includes("tcp") ||
    lower.includes("udp")
  ) {
    return "计算机网络";
  }
  if (raw.includes("工程化") || lower.includes("vite") || lower.includes("webpack") || lower.includes("build")) {
    return "工程化";
  }
  if (raw.includes("性能") || lower.includes("performance") || lower.includes("web vitals")) {
    return "性能优化";
  }
  return "综合";
}

function inferNoteTypeFromText(text: string) {
  const content = text.toLowerCase();
  const score: Record<string, number> = {
    计算机网络: 0,
    JavaScript: 0,
    TypeScript: 0,
    React: 0,
    Vue: 0,
    CSS: 0,
    浏览器: 0,
    工程化: 0,
    性能优化: 0,
    综合: 0,
  };

  const hit = (keys: string[], type: keyof typeof score, weight = 1) => {
    for (const key of keys) {
      if (content.includes(key)) score[type] += weight;
    }
  };

  hit(["http", "https", "tcp", "udp", "tls", "ssl", "dns", "cdn", "网络", "缓存", "握手"], "计算机网络", 2);
  hit(["javascript", "闭包", "原型", "事件循环", "promise", "js"], "JavaScript", 2);
  hit(["typescript", "ts", "泛型", "类型体操", "infer", "类型守卫"], "TypeScript", 2);
  hit(["react", "hooks", "fiber", "jsx", "next.js"], "React", 2);
  hit(["vue", "pinia", "vuex", "composition api", "watch"], "Vue", 2);
  hit(["css", "flex", "grid", "bfc", "样式", "布局", "选择器"], "CSS", 2);
  hit(["浏览器", "render", "reflow", "repaint", "dom", "bom"], "浏览器", 2);
  hit(["webpack", "vite", "rollup", "babel", "构建", "工程化", "ci/cd"], "工程化", 2);
  hit(["性能", "性能优化", "web vitals", "lcp", "cls", "ttfb", "首屏"], "性能优化", 2);

  let best: keyof typeof score = "综合";
  for (const key of Object.keys(score) as Array<keyof typeof score>) {
    if (score[key] > score[best]) best = key;
  }
  return best;
}

function normalizeEscapedText(input: unknown) {
  if (typeof input !== "string") return "";
  return input
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    // Remove trailing markdown hard-break backslashes that AI often emits per line.
    .replace(/[ \t]*\\$/gm, "");
}

function parseNestedNotePayload(text: string) {
  const candidate = parseStructuredJson(text);
  if (!candidate || typeof candidate !== "object") return null;
  const obj = candidate as Record<string, unknown>;
  const hasExpectedShape =
    "noteType" in obj || "tags" in obj || "memoryVersion" in obj || "detailedVersion" in obj;
  return hasExpectedShape ? obj : null;
}

function stripSchemaLeakPrefix(text: string) {
  const normalized = normalizeEscapedText(text);
  const lines = normalized.split("\n");
  if (lines.length === 0) return normalized;

  const head = lines[0].trim();
  const looksLikeSchemaLeak =
    head.startsWith("{") &&
    (head.includes("\"noteType\"") ||
      head.includes("\"tags\"") ||
      head.includes("\"memoryVersion\"") ||
      head.includes("\"detailedVersion\""));

  if (!looksLikeSchemaLeak) {
    return normalized;
  }

  const firstHeadingIndex = lines.findIndex((line) => line.trim().startsWith("## "));
  if (firstHeadingIndex > 0) {
    return lines.slice(firstHeadingIndex).join("\n").trim();
  }

  return lines.slice(1).join("\n").trim();
}

function sanitizeOptimizeCandidate(input: unknown) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const source = input as Record<string, unknown>;
  const nestedFromDetailed =
    typeof source.detailedVersion === "string"
      ? parseNestedNotePayload(source.detailedVersion)
      : null;
  const nestedFromContent =
    typeof source.content === "string" ? parseNestedNotePayload(source.content) : null;
  const mergedSource = {
    ...source,
    ...(nestedFromDetailed ?? {}),
    ...(nestedFromContent ?? {}),
  } as Record<string, unknown>;

  const tagsSource = mergedSource.tags;
  const tags = Array.isArray(tagsSource)
    ? tagsSource
    : typeof tagsSource === "string"
      ? tagsSource.split(/[，,]/)
      : [];

  const normalizedTags = Array.from(
    new Set(
      tags
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  ).slice(0, 8);

  return {
    ...mergedSource,
    memoryVersion: normalizeEscapedText(
      mergedSource.memoryVersion ?? mergedSource.summaryVersion ?? mergedSource.shortVersion,
    ),
    detailedVersion: stripSchemaLeakPrefix(
      String(mergedSource.detailedVersion ?? mergedSource.detailVersion ?? mergedSource.content ?? ""),
    ),
    noteType: normalizeNoteType(mergedSource.noteType),
    tags: normalizedTags,
  };
}

function inferTags(title: string, noteType: string) {
  const tags = new Set<string>();
  if (noteType && noteType !== "综合") {
    tags.add(noteType);
  }

  const lower = title.toLowerCase();
  if (lower.includes("http") || title.includes("网络")) tags.add("HTTP");
  if (lower.includes("https") || lower.includes("tls")) tags.add("TLS");
  if (lower.includes("react")) tags.add("React");
  if (lower.includes("vue")) tags.add("Vue");
  if (lower.includes("hook")) tags.add("Hooks");
  if (lower.includes("css") || title.includes("样式")) tags.add("CSS");
  if (title.includes("性能") || lower.includes("performance")) tags.add("性能优化");
  if (title.includes("缓存") || lower.includes("cache")) tags.add("缓存");
  if (title.includes("浏览器") || lower.includes("browser")) tags.add("浏览器");

  if (tags.size === 0) {
    tags.add("前端");
  }

  return Array.from(tags).slice(0, 8);
}

function buildDigestFromContent(content: string, fallbackTitle: string) {
  const plain = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  if (!plain) return `${fallbackTitle} 面试要点速览`;
  return plain.slice(0, 80);
}

function buildMemoryVersion(detailedVersion: string, title: string) {
  const bulletLines = detailedVersion
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .slice(0, 6);

  if (bulletLines.length >= 2) {
    return bulletLines.join("\n");
  }

  const plain = detailedVersion
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  const top = plain.slice(0, 100);
  return `- ${title} 的核心目标与定义\n- 关键原理与边界条件\n- 高频追问与回答框架\n- 实战落地建议\n- 易错点：${top || "注意概念边界和实现细节"}`;
}

function ensureDetailedSections(text: string) {
  const normalized = normalizeEscapedText(text).trim();
  if (!normalized) {
    return [
      "## 问题定义",
      "待补充",
      "",
      "## 核心原理",
      "待补充",
      "",
      "## 高频追问",
      "1. 待补充",
      "",
      "## 实战建议",
      "1. 待补充",
      "",
      "## 易错点",
      "1. 待补充",
    ].join("\n");
  }

  const required = ["问题定义", "核心原理", "高频追问", "实战建议", "易错点"];
  let merged = normalized;
  for (const section of required) {
    if (!merged.includes(`## ${section}`)) {
      merged += `\n\n## ${section}\n待补充`;
    }
  }
  return merged;
}

function recoverLooseCandidate({
  rawText,
  title,
  requestedType,
}: {
  rawText: string;
  title: string;
  requestedType?: string;
}) {
  const detailedVersion = ensureDetailedSections(rawText);
  const specified = normalizeNoteType(requestedType);
  const inferred = inferNoteTypeFromText(`${title}\n${rawText}`);
  const noteType = specified !== "综合" ? specified : inferred;
  return {
    noteType,
    tags: inferTags(title, noteType),
    memoryVersion: buildMemoryVersion(detailedVersion, title),
    detailedVersion,
  };
}

function summarizeZodIssues(input: unknown) {
  const parsed = optimizeNoteOutputSchema.safeParse(input);
  if (parsed.success) return null;

  return parsed.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: "admin:notes:optimize",
    ipLike: request.headers.get("x-forwarded-for"),
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests, please retry later" },
      { status: 429 },
    );
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "缺少 GEMINI_API_KEY，请先在 .env.local 配置" },
      { status: 500 },
    );
  }

  const rawBody = await request.json();
  const parsedInput = optimizeNoteInputSchema.safeParse(rawBody);
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: parsedInput.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    let previousIssueHint: string | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await generateContentWithRetry({
        ai,
        model,
        maxRetries: 1,
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `八股文标题：${parsedInput.data.title}` },
              ...(parsedInput.data.noteType ? [{ text: `指定类型：${parsedInput.data.noteType}` }] : []),
              ...(parsedInput.data.noteSlug ? [{ text: `指定 slug：${parsedInput.data.noteSlug}` }] : []),
              ...(previousIssueHint
                ? [
                    {
                      text: `上一次输出未通过校验。请修正以下问题后仅返回 JSON 对象：${previousIssueHint}`,
                    },
                  ]
                : []),
            ],
          },
        ],
      });

      const rawText = parseGeminiText(response as GeminiResponse);
      const parsedJson = rawText ? parseStructuredJson(rawText) : null;
      const sanitized = parsedJson
        ? sanitizeOptimizeCandidate(parsedJson)
        : recoverLooseCandidate({
            rawText: rawText || "",
            title: parsedInput.data.title,
            requestedType: parsedInput.data.noteType,
          });
      const parsedOutput = optimizeNoteOutputSchema.safeParse(sanitized);
      if (!parsedOutput.success) {
        previousIssueHint = summarizeZodIssues(sanitized) ?? "字段格式不正确";
        continue;
      }

      const strictRequested = normalizeNoteType(parsedInput.data.noteType);
      const inferredByContent = inferNoteTypeFromText(
        `${parsedInput.data.title}\n${parsedOutput.data.memoryVersion}\n${parsedOutput.data.detailedVersion}\n${parsedOutput.data.tags.join(" ")}`,
      );
      const finalNoteType = strictRequested !== "综合" ? strictRequested : inferredByContent;

      const memoryVersion = parsedOutput.data.memoryVersion.trim();
      const detailedVersion = parsedOutput.data.detailedVersion.trim();
      const content = [
        "## 速记版",
        memoryVersion,
        "",
        "## 详解版",
        detailedVersion,
      ].join("\n");

      const draftPayload = {
        title: parsedInput.data.title,
        note_type: finalNoteType,
        note_slug: ensureValidNoteSlug(parsedInput.data.noteSlug ?? parsedInput.data.title),
        digest: buildDigestFromContent(content, parsedInput.data.title),
        tags: parsedOutput.data.tags,
        content,
        is_published: false,
        created_by: auth.user.id,
        created_by_email: auth.user.email ?? null,
      };

      const supabaseAdmin = createAdminClient();
      const draftInsert = await supabaseAdmin
        .from("admin_notes")
        .insert(draftPayload)
        .select("id,title,is_published,created_at")
        .single();

      // Backward-compatible fallback when note_type column is not present yet.
      if (draftInsert.error?.message?.includes("note_type")) {
        return NextResponse.json(
          { error: "数据库缺少 note_type 字段，请先执行迁移后再使用 AI 自动生成草稿。" },
          { status: 500 },
        );
      }
      if (draftInsert.error?.message?.includes("note_slug")) {
        return NextResponse.json(
          { error: "数据库缺少 note_slug 字段，请先执行迁移后再使用 AI 自动生成草稿。" },
          { status: 500 },
        );
      }

      if (draftInsert.error || !draftInsert.data) {
        logServerError("admin.notes.optimize.insertDraft", draftInsert.error ?? "No draft data", {
          adminUserId: auth.user.id,
          title: parsedInput.data.title,
        });
        return NextResponse.json({ error: "AI 已生成内容，但草稿入库失败，请重试" }, { status: 500 });
      }

      logAdminAction("note.optimized", {
        adminUserId: auth.user.id,
        adminEmail: auth.user.email,
        model,
        draftId: draftInsert.data.id,
      });

      return NextResponse.json({
        result: {
          ...parsedOutput.data,
          noteType: finalNoteType,
          noteSlug: draftPayload.note_slug,
          content,
          title: parsedInput.data.title,
        },
        draft: {
          id: draftInsert.data.id,
          title: draftInsert.data.title,
          isPublished: draftInsert.data.is_published,
          createdAt: draftInsert.data.created_at,
        },
      });
    }

    return NextResponse.json(
      { error: "AI 返回内容不稳定，请重试（建议精简标题并明确目标类型）" },
      { status: 502 },
    );
  } catch (error) {
    logServerError("admin.notes.optimize", error, {
      adminUserId: auth.user.id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 填充失败" },
      { status: 500 },
    );
  }
}
