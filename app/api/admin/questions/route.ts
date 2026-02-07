import { NextRequest, NextResponse } from "next/server";

import { questionFormSchema } from "@/lib/admin-schemas";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("admin_questions")
      .select("id,title,slug,description,starter_code,test_script,reference_solution,level,category,duration,is_published,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const questions = (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      starterCode: item.starter_code,
      testScript: item.test_script,
      referenceSolution: item.reference_solution,
      level: item.level,
      category: item.category,
      duration: item.duration,
      isPublished: item.is_published,
      createdAt: item.created_at,
    }));

    return NextResponse.json({ questions });
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

  const rawBody = await request.json();
  const parsed = questionFormSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("admin_questions").insert({
      title: body.title,
      slug: body.slug,
      description: body.description,
      starter_code: body.starterCode,
      test_script: body.testScript,
      reference_solution: body.referenceSolution,
      level: body.level,
      category: body.category,
      duration: body.duration,
      solved_count: "0 完成",
      is_published: body.isPublished,
      created_by: auth.user.id,
      created_by_email: auth.user.email ?? null,
    });

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
