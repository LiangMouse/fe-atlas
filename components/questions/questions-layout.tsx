"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CategorySidebar, type QuestionCategory } from "@/components/questions/category-sidebar";
import { QuestionsList } from "@/components/questions/questions-list";
import { QuestionsToolbar } from "@/components/questions/questions-toolbar";
import type { PracticeQuestion } from "@/lib/questions";

type CategoryPreset = {
  key: string;
  label: string;
  matcher: (question: PracticeQuestion) => boolean;
};

const CATEGORY_PRESETS: CategoryPreset[] = [
  { key: "javascript", label: "JavaScript", matcher: (q) => /javascript/i.test(`${q.category} ${q.title}`) },
  { key: "typescript", label: "TypeScript", matcher: (q) => /typescript/i.test(`${q.category} ${q.title}`) },
  { key: "react", label: "React", matcher: (q) => /react/i.test(`${q.title} ${q.description}`) },
  { key: "vue", label: "Vue", matcher: (q) => /\bvue\b/i.test(`${q.title} ${q.description}`) },
  { key: "css", label: "CSS", matcher: (q) => /\bcss\b|样式|布局/i.test(`${q.title} ${q.description}`) },
  { key: "browser", label: "浏览器", matcher: (q) => /浏览器|render|paint|composite|reflow|repaint/i.test(`${q.title} ${q.description}`) },
  { key: "network", label: "网络", matcher: (q) => /http|网络|缓存|协议|etag|cache-control/i.test(`${q.title} ${q.description}`) },
];

function buildCategories(questions: PracticeQuestion[]): QuestionCategory[] {
  const items = CATEGORY_PRESETS.map((preset) => ({
    key: preset.key,
    label: preset.label,
    count: questions.filter((question) => preset.matcher(question)).length,
  }));

  return [{ key: "all", label: "全部", count: questions.length }, ...items];
}

function getCategoryLabel(categories: QuestionCategory[], key: string) {
  return categories.find((category) => category.key === key)?.label ?? "全部";
}

function filterByCategory(questions: PracticeQuestion[], category: string) {
  if (category === "all") {
    return questions;
  }

  const preset = CATEGORY_PRESETS.find((item) => item.key === category);
  if (!preset) {
    return questions;
  }

  return questions.filter((question) => preset.matcher(question));
}

export function QuestionsLayout({ questions }: { questions: PracticeQuestion[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categories = useMemo(() => buildCategories(questions), [questions]);
  const available = useMemo(() => new Set(categories.map((item) => item.key)), [categories]);

  const rawCategory = searchParams.get("category")?.toLowerCase() ?? "all";
  const activeCategory = available.has(rawCategory) ? rawCategory : "all";

  const filteredQuestions = useMemo(
    () => filterByCategory(questions, activeCategory),
    [questions, activeCategory],
  );

  const updateCategory = (category: string) => {
    const next = new URLSearchParams(searchParams.toString());

    if (category === "all") {
      next.delete("category");
    } else {
      next.set("category", category);
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <CategorySidebar
        categories={categories}
        activeCategory={activeCategory}
        onSelect={updateCategory}
        className="hidden h-fit rounded-2xl border border-slate-300/80 bg-white/80 p-3 backdrop-blur-sm lg:sticky lg:top-24 lg:block"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white/80 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="border-b border-slate-200 bg-white/70 px-4 py-3 sm:px-5 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {categories.map((category) => {
              const selected = category.key === activeCategory;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => updateCategory(category.key)}
                  className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selected
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {category.label} ({category.count})
                </button>
              );
            })}
          </div>
        </div>

        <QuestionsToolbar
          currentCategory={getCategoryLabel(categories, activeCategory)}
          total={filteredQuestions.length}
        />
        <QuestionsList questions={filteredQuestions} onReset={() => updateCategory("all")} />
      </div>
    </section>
  );
}
