import { NextRequest, NextResponse } from "next/server";

import { noteFormSchema } from "@/lib/admin-schemas";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { logAdminAction, logServerError } from "@/lib/logger";
import { ensureValidNoteSlug } from "@/lib/note-route";
import { resolveNoteType } from "@/lib/note-types";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

function buildDigestFromContent(content: string, fallbackTitle: string) {
  const plain = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  if (!plain) return `${fallbackTitle} 面试要点速览`;
  return plain.slice(0, 80);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const query = supabaseAdmin
      .from("admin_notes")
      .select("id,title,note_type,note_slug,digest,tags,content,is_published,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const first = await query;
    let data = (first.data ?? []) as Array<Record<string, unknown>>;
    let error = first.error;

    if (error?.message?.includes("note_type")) {
      const fallback = await supabaseAdmin
        .from("admin_notes")
        .select("id,title,note_slug,digest,tags,content,is_published,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      data = (fallback.data ?? []) as Array<Record<string, unknown>>;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const notes = data.map((item) => ({
      id: item.id,
      title: item.title,
      noteSlug: ensureValidNoteSlug(String(item.note_slug ?? ""), `note-${String(item.id)}`),
      noteType: resolveNoteType(
        (item.note_type as string | null | undefined) ?? null,
        `${String(item.title ?? "")}\n${String(item.digest ?? "")}\n${Array.isArray(item.tags) ? item.tags.join(" ") : ""}\n${String(item.content ?? "")}`,
      ),
      digest: item.digest,
      tags: item.tags ?? [],
      content: item.content ?? "",
      isPublished: item.is_published,
      createdAt: item.created_at,
    }));

    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: "admin:notes:write",
    ipLike: request.headers.get("x-forwarded-for"),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests, please retry later" },
      { status: 429 },
    );
  }

  const rawBody = await request.json();
  const parsed = noteFormSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    const supabaseAdmin = createAdminClient();
    const insertPayload = {
      title: body.title,
      note_type: body.noteType,
      note_slug: body.noteSlug,
      digest: buildDigestFromContent(body.content, body.title),
      tags: body.tags,
      content: body.content || null,
      is_published: body.isPublished,
      created_by: auth.user.id,
      created_by_email: auth.user.email ?? null,
    };

    const { error } = await supabaseAdmin.from("admin_notes").insert(insertPayload);
    if (error?.message?.includes("note_type")) {
      return NextResponse.json(
        { error: "数据库缺少 note_type 字段，请先执行迁移后再创建八股文。" },
        { status: 500 },
      );
    }
    if (error?.message?.includes("note_slug")) {
      return NextResponse.json(
        { error: "数据库缺少 note_slug 字段，请先执行迁移后再创建八股文。" },
        { status: 500 },
      );
    }
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "发布态下该「类型 + slug」已存在，请修改 slug 或先下线同路由内容。" },
        { status: 409 },
      );
    }

    if (error) {
      logServerError("admin.notes.create", error, { adminUserId: auth.user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logAdminAction("note.created", {
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
      title: body.title,
      noteType: body.noteType,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("admin.notes.create", error, { adminUserId: auth.user.id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
