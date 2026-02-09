import { logServerError } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

export type PracticeQuestion = {
  id: number;
  slug: string;
  title: string;
  level: "初级" | "中等" | "高级";
  category: "JavaScript" | "React" | "UI构建";
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

export type RawQuestion = {
  id: number;
  slug: string;
  title: string;
  level: "初级" | "中等" | "高级";
  category: string;
  duration: string;
  solved_count: string | null;
  description: string;
  starter_code: string;
  test_script: string;
  reference_solution: string;
};

function normalizeQuestionCategory(value: string): PracticeQuestion["category"] {
  if (value === "React" || value === "UI构建" || value === "JavaScript") {
    return value;
  }

  // Backward compatibility: keep old TypeScript data visible.
  if (value === "TypeScript") {
    return "JavaScript";
  }

  return "JavaScript";
}

export function normalizePracticeQuestion(item: RawQuestion): PracticeQuestion {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    level: item.level,
    category: normalizeQuestionCategory(item.category),
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
    const supabase =
      process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : isSupabaseConfigured ? createPublicClient() : null;
    if (!supabase) {
      return [] as PracticeQuestion[];
    }

    const { data, error } = await supabase
      .from("admin_questions")
      .select("id,slug,title,level,category,duration,solved_count,description,starter_code,test_script,reference_solution")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      logServerError("questions.getPublishedQuestions", error);
      return [] as PracticeQuestion[];
    }

    return (data ?? []).map((item) => normalizePracticeQuestion(item as RawQuestion));
  } catch (error) {
    logServerError("questions.getPublishedQuestions", error);
    return [] as PracticeQuestion[];
  }
}

export async function getPublishedQuestionBySlug(slug: string) {
  try {
    const supabase =
      process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : isSupabaseConfigured ? createPublicClient() : null;
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("admin_questions")
      .select("id,slug,title,level,category,duration,solved_count,description,starter_code,test_script,reference_solution")
      .eq("is_published", true)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        logServerError("questions.getPublishedQuestionBySlug", error, { slug });
      }
      return null;
    }

    return normalizePracticeQuestion(data as RawQuestion);
  } catch (error) {
    logServerError("questions.getPublishedQuestionBySlug", error, { slug });
    return null;
  }
}
