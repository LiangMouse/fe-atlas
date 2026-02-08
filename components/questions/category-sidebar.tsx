"use client";

export type QuestionCategory = {
  key: string;
  label: string;
  count: number;
};

export function CategorySidebar({
  categories,
  activeCategory,
  onSelect,
  className,
}: {
  categories: QuestionCategory[];
  activeCategory: string;
  onSelect: (category: string) => void;
  className?: string;
}) {
  return (
    <aside
      className={className ?? "rounded-2xl border border-slate-300/80 bg-white/80 p-3 backdrop-blur-sm"}
      aria-label="题目分类筛选"
    >
      <div className="mb-3 px-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500">技术栈分类</p>
      </div>

      <nav className="space-y-1">
        {categories.map((category) => {
          const selected = category.key === activeCategory;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelect(category.key)}
              aria-pressed={selected}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                selected
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span className="font-medium">{category.label}</span>
              <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
                {category.count}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
