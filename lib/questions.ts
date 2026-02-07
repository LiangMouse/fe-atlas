import { createAdminClient } from "@/lib/supabase/admin";

export type PracticeQuestion = {
  id: number;
  slug: string;
  title: string;
  level: "初级" | "中等" | "高级";
  category: "JavaScript" | "TypeScript";
  duration: string;
  solvedCount: string;
  description: string;
  starterCode: string;
  testScript: string;
  referenceSolution: string;
};

export type PracticeQuestionNavItem = {
  slug: string;
  title: string;
};

type RawQuestion = {
  id: number;
  slug: string;
  title: string;
  level: "初级" | "中等" | "高级";
  category: "JavaScript" | "TypeScript";
  duration: string;
  solved_count: string | null;
  description: string;
  starter_code: string;
  test_script: string;
  reference_solution: string;
};

function toPracticeQuestion(item: RawQuestion): PracticeQuestion {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    level: item.level,
    category: item.category,
    duration: item.duration,
    solvedCount: item.solved_count ?? "0 完成",
    description: item.description,
    starterCode: item.starter_code,
    testScript: item.test_script,
    referenceSolution: item.reference_solution || "暂未提供参考答案",
  };
}

export async function getPublishedQuestions() {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("admin_questions")
      .select("id,slug,title,level,category,duration,solved_count,description,starter_code,test_script,reference_solution")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      return [] as PracticeQuestion[];
    }

    return (data ?? []).map((item) => toPracticeQuestion(item as RawQuestion));
  } catch {
    return [] as PracticeQuestion[];
  }
}

export async function getPublishedQuestionBySlug(slug: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("admin_questions")
      .select("id,slug,title,level,category,duration,solved_count,description,starter_code,test_script,reference_solution")
      .eq("is_published", true)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toPracticeQuestion(data as RawQuestion);
  } catch {
    return null;
  }
}
