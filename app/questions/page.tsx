import Link from "next/link";
import { Flame, Sparkles, Timer } from "lucide-react";

import { QuestionsLayout } from "@/components/questions/questions-layout";
import { getPublishedQuestions } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = await getPublishedQuestions();
  return (
    <main className="mx-auto h-full w-full max-w-[1680px] overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-300/80 bg-white/80 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Handwrite Practice
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              前端手写题库
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              每道题都有独立工作台，包含题目描述、代码编辑器和测试执行。建议按难度由浅入深，形成稳定解题模板。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            返回首页
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">题目总量</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{questions.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">推荐节奏</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Timer className="h-4 w-4" />
              每天 2 题
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">目标完成率</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Flame className="h-4 w-4" />
              80%+
            </p>
          </article>
        </div>
      </section>

      <QuestionsLayout questions={questions} />
    </main>
  );
}
