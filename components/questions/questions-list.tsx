import { QuestionCard } from "@/components/questions/question-card";
import type { PracticeQuestion } from "@/lib/questions";

export function QuestionsList({
  questions,
  onReset,
}: {
  questions: PracticeQuestion[];
  onReset: () => void;
}) {
  if (questions.length === 0) {
    return (
      <div className="px-4 py-10 text-center sm:px-5">
        <p className="text-sm font-medium text-slate-700">当前分类下暂无题目</p>
        <p className="mt-1 text-xs text-slate-500">你可以切换分类，或查看全部题目。</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          查看全部
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
      {questions.map((item) => (
        <QuestionCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
