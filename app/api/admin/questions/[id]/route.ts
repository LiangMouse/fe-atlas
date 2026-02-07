import { NextRequest, NextResponse } from "next/server";

import { questionPatchSchema } from "@/lib/admin-schemas";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function parseId(id: string) {
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const questionId = parseId(id);
  if (!questionId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rawBody = await request.json();
  const parsed = questionPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.slug !== undefined) patch.slug = body.slug;
    if (body.description !== undefined) patch.description = body.description;
    if (body.starterCode !== undefined) patch.starter_code = body.starterCode;
    if (body.testScript !== undefined) patch.test_script = body.testScript;
    if (body.referenceSolution !== undefined) patch.reference_solution = body.referenceSolution;
    if (body.level !== undefined) patch.level = body.level;
    if (body.category !== undefined) patch.category = body.category;
    if (body.duration !== undefined) patch.duration = body.duration;
    if (body.isPublished !== undefined) patch.is_published = body.isPublished;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("admin_questions")
      .update(patch)
      .eq("id", questionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const questionId = parseId(id);
  if (!questionId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("admin_questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
