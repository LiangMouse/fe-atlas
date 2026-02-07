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

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `管理员草稿：\n${parsedInput.data.prompt}` },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const rawText = parseGeminiText(response as GeminiResponse);
    if (!rawText) {
      return NextResponse.json({ error: "AI 未返回可解析内容" }, { status: 502 });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(toJsonString(rawText));
    } catch {
      return NextResponse.json({ error: "AI 返回内容不是有效 JSON" }, { status: 502 });
    }

    const parsedOutput = optimizeQuestionOutputSchema.safeParse(parsedJson);
    if (!parsedOutput.success) {
      return NextResponse.json(
        { error: "AI 返回格式不符合要求，请重试" },
        { status: 502 },
      );
    }

    return NextResponse.json({ result: parsedOutput.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 优化失败" },
      { status: 500 },
    );
  }
}
