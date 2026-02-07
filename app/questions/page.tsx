import Link from "next/link";
import { ArrowRight, FileCode2, Flame, Sparkles, Timer } from "lucide-react";

import { getPublishedQuestions } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = await getPublishedQuestions();
  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 py-3 sm:px-6 lg:px-8">
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

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-300/80 bg-white/80 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.75fr_0.75fr_80px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
          <span>题目</span>
          <span>分类</span>
          <span>难度</span>
          <span>通过人数</span>
          <span />
        </div>

        <div>
          {questions.map((item) => (
            <Link
              key={item.slug}
              href={`/questions/${item.slug}`}
              className="grid cursor-pointer grid-cols-[1.2fr_0.8fr_0.75fr_0.75fr_80px] items-center border-b border-slate-100 px-4 py-4 transition-colors last:border-0 hover:bg-slate-50/70"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{item.duration}</p>
              </div>

              <span className="inline-flex w-fit items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                <FileCode2 className="h-3 w-3" />
                {item.category}
              </span>

              <span className="text-sm text-slate-700">{item.level}</span>
              <span className="text-sm text-slate-700">{item.solvedCount}</span>

              <span className="inline-flex justify-end text-slate-500">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
          {questions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              暂无已发布题目，请先在管理员后台发布题目。
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
