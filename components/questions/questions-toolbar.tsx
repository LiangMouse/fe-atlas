"use client";

export function QuestionsToolbar({
  currentCategory,
  total,
}: {
  currentCategory: string;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">{currentCategory}</p>
        <p className="mt-0.5 text-xs text-slate-500">共 {total} 道题</p>
      </div>

      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
        <span className="font-medium text-slate-600">排序</span>
        <span>最新发布</span>
      </div>
    </div>
  );
}
