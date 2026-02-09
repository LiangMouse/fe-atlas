import { QuestionCard } from "@/components/questions/question-card";
import type { PracticeQuestion } from "@/lib/questions";

export function QuestionsList({
  questions,
}: {
  questions: PracticeQuestion[];
}) {
  if (questions.length === 0) {
    return (
      <div className="px-4 py-10 text-center sm:px-5">
        <p className="text-sm font-medium text-slate-700">暂无题目</p>
        <p className="mt-1 text-xs text-slate-500">请前往管理后台创建并发布题目。</p>
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
