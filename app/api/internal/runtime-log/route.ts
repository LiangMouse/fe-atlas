import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const payloadSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  outcome: z.enum(["success", "error"]),
  passed: z.number().int().min(0).max(10_000),
  total: z.number().int().min(0).max(10_000),
  logs: z.array(z.string().max(2_000)).max(300),
  error: z.string().max(2_000).optional(),
});

function formatLogBlock(input: z.infer<typeof payloadSchema>) {
  const now = new Date().toISOString();
  const lines = [
    `[${now}] slug=${input.slug} outcome=${input.outcome} passed=${input.passed}/${input.total}`,
    ...(input.error ? [`error: ${input.error}`] : []),
    ...input.logs.map((line) => `log: ${line}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const logDir = path.join(process.cwd(), ".runtime-logs");
    const logFile = path.join(logDir, "question-runner.log");
    await mkdir(logDir, { recursive: true });
    await appendFile(logFile, formatLogBlock(parsed.data), "utf8");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to persist runtime log" }, { status: 500 });
  }
}
