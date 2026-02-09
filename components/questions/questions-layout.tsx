"use client";

import { QuestionsList } from "@/components/questions/questions-list";
import { QuestionsToolbar } from "@/components/questions/questions-toolbar";
import type { PracticeQuestion } from "@/lib/questions";

export function QuestionsLayout({ questions }: { questions: PracticeQuestion[] }) {
  return (
    <section className="mt-3">
      <div className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white/80 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <QuestionsToolbar currentCategory="全部题目" total={questions.length} />
        <QuestionsList questions={questions} />
      </div>
    </section>
  );
}
