import Link from "next/link";
import { Sparkles } from "lucide-react";

import { QuestionsLayout } from "@/components/questions/questions-layout";
import { getPublishedQuestions } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = await getPublishedQuestions();
  return (
    <main className="mx-auto h-full w-full max-w-[1680px] overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-300/80 bg-white/80 px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Handwrite Practice
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">前端手写题库</h1>
            <p className="mt-2 text-sm text-slate-600">前端手写考察频率很高，不比力扣算法频率低，通常包含 JS 的手写, UI构建（如红绿灯组件），React hook等其他的手写等。 </p>
          </div>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            返回首页
          </Link>
        </div>
      </section>

      <QuestionsLayout questions={questions} />
    </main>
  );
}
