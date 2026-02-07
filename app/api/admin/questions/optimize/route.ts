import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import {
  optimizeQuestionInputSchema,
  optimizeQuestionOutputSchema,
} from "@/lib/admin-schemas";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";

const DEFAULT_MODEL = "gemini-3-flash-preview";

const SYSTEM_PROMPT = `你是资深前端面试题编辑。请把管理员给出的模糊题目草稿，优化为可直接发布的前端手写题题目数据。
要求：
1) 题目描述必须中文，结构化且清晰：题目说明 + 注意事项 + 示例（至少2个）+ 提示。
2) 示例里的输入输出要互相一致。
2.1) “示例”必须使用代码描述，风格贴近前端面试平台：在 description 中输出一个 \`javascript\` 代码块（\`\`\`javascript ... \`\`\`），代码块内按“注释说明 + 函数调用 + 期望输出注释”组织，例如：
   // 基础场景
   someFn(input); // expectedOutput
   // 边界场景
   someFn(edgeInput); // expectedEdgeOutput
2.2) 禁止把示例只写成自然语言“输入/输出”句子；必须主要以代码块呈现。
3) starterCode 为 JavaScript 模板代码，函数名与题意一致，且可用于候选人答题。模板代码中必须包含清晰的函数注解（JSDoc），至少包括：
   - @param（每个入参名称 + 类型 + 含义）
   - @returns（返回值类型 + 含义）
   若管理员草稿里函数是 "export default function xxx(...)"，也必须补全以上注解再输出。
4) testScript 使用 Jest 风格，包含多个测试用例，覆盖正常与边界情况；import 语句应导入 starterCode 中默认导出的函数。
5) slug 必须是英文小写 kebab-case，仅字母/数字/连字符。
6) level 仅可为：初级/中等/高级；category 仅可为：JavaScript/TypeScript。
7) duration 给出建议时长，例如“15 分钟”。
8) “提示”部分必须非常克制：最多 1-2 条、每条一句话、仅帮助理解题目目标与边界，不得直接给出关键实现思路、算法步骤或可直接照抄的解法。
9) 必须额外产出 referenceSolution（参考答案），内容为可运行的高质量示例实现，并附少量关键思路注释，便于学习。
10) 输出 JSON 必须包含这些字段：title, slug, description, starterCode, testScript, referenceSolution, level, category, duration。

只输出 JSON，不要 markdown 代码块，不要额外解释。`;

const QUESTION_JSON_SCHEMA = {
  type: "object",
  required: [
    "title",
    "slug",
    "description",
    "starterCode",
    "testScript",
    "referenceSolution",
    "level",
    "category",
    "duration",
  ],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 2 },
    slug: { type: "string", pattern: "^[a-z0-9-]+$" },
    description: { type: "string", minLength: 20 },
    starterCode: { type: "string", minLength: 5 },
    testScript: { type: "string", minLength: 5 },
    referenceSolution: { type: "string", minLength: 10 },
    level: { type: "string", enum: ["初级", "中等", "高级"] },
    category: { type: "string", enum: ["JavaScript", "TypeScript"] },
    duration: { type: "string", minLength: 2 },
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

  const text = error.message.toLowerCase();
  return (
    text.includes("503") ||
    text.includes("unavailable") ||
    text.includes("overloaded") ||
    text.includes("timeout") ||
    text.includes("429") ||
    text.includes("rate limit")
  );
}

async function generateContentWithRetry({
  ai,
  model,
  contents,
  maxRetries = 3,
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
          responseJsonSchema: QUESTION_JSON_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === maxRetries) {
        throw error;
      }

      const delayMs = 800 * 2 ** attempt;
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function parseGeminiText(response: GeminiResponse) {
  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const merged = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return merged;
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
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
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
  const candidates: string[] = [];
  const direct = toJsonString(rawText);
  candidates.push(direct);

  const extractedFromRaw = extractFirstJsonObject(rawText);
  if (extractedFromRaw) {
    candidates.push(extractedFromRaw);
  }

  const extractedFromDirect = extractFirstJsonObject(direct);
  if (extractedFromDirect) {
    candidates.push(extractedFromDirect);
  }

  for (const text of candidates) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // try next
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "缺少 GEMINI_API_KEY，请先在 .env.local 配置" },
      { status: 500 },
    );
  }

  const rawBody = await request.json();
  const parsedInput = optimizeQuestionInputSchema.safeParse(rawBody);
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: parsedInput.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const attempts = [0, 1] as const;

    for (const attempt of attempts) {
      const response = await generateContentWithRetry({
        ai,
        model,
        maxRetries: 3,
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `管理员草稿：\n${parsedInput.data.prompt}` },
              ...(attempt === 1
                ? [{ text: "上一次结果未通过解析。请仅返回严格 JSON 对象，不要包含任何额外文本。" }]
                : []),
            ],
          },
        ],
      });

      const rawText = parseGeminiText(response as GeminiResponse);
      if (!rawText) {
        continue;
      }

      const parsedJson = parseStructuredJson(rawText);
      if (!parsedJson) {
        continue;
      }

      const parsedOutput = optimizeQuestionOutputSchema.safeParse(parsedJson);
      if (!parsedOutput.success) {
        continue;
      }

      return NextResponse.json({ result: parsedOutput.data });
    }

    return NextResponse.json(
      { error: "AI 返回内容不稳定，请重试（建议缩短输入草稿或减少歧义）" },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 优化失败" },
      { status: 500 },
    );
  }
}
