import Link from "next/link";
import { ArrowRight, FileCode2 } from "lucide-react";

import type { PracticeQuestion } from "@/lib/questions";

function levelClasses(level: PracticeQuestion["level"]) {
  if (level === "高级") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (level === "中等") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function QuestionCard({ item }: { item: PracticeQuestion }) {
  return (
    <Link
      href={`/questions/${item.slug}`}
      className="group block rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-slate-300 hover:bg-slate-50/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">{item.title}</p>
          <p className="mt-1 text-sm text-slate-500">{item.duration}</p>
        </div>

        <span className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
          <FileCode2 className="h-3 w-3" />
          {item.category}
        </span>

        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${levelClasses(item.level)}`}>
          {item.level}
        </span>

        <span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
          {item.solvedCount}
        </span>
      </div>
    </Link>
  );
}
