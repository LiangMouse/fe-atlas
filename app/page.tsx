import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookMarked, Code2, Sparkles, Trophy } from "lucide-react";

const sections = [
  {
    title: "八股文",
    description: "按真实面试问法拆解核心知识点，快速形成结构化回答。",
    href: "/notes",
    icon: BookMarked,
    label: "知识库",
  },
  {
    title: "算法",
    description: "高频题型模板 + 复杂度分析，聚焦前端岗位常见题。",
    href: "/algorithms",
    icon: Trophy,
    label: "题型训练",
  },
  {
    title: "前端手写",
    description: "每题独立工作台，支持在线编写、运行测试与结果反馈。",
    href: "/questions",
    icon: Code2,
    label: "实战演练",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ adminRequired?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto h-full max-w-6xl overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 md:overflow-hidden lg:px-8">
      <div className="flex flex-col gap-4 md:h-full md:min-h-0">
        <section className="shrink-0 rounded-2xl border border-[#e9e9e7] bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#787774]">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#f6f6f4] px-2 py-1">
              <Sparkles className="h-3 w-3" />
              Community Workspace
            </span>
            <span>面向前端开发者的面试复习工作台</span>
          </div>

          <h1 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight tracking-tight text-[#191919] sm:text-4xl">
            Atlas FE 面试复习社区
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f5e5b]">
            Notion 风格的信息界面，强调信息分层与任务流。你可以先看八股文建立知识骨架，再刷算法，最后在手写工作台完成代码实战。
          </p>

          {params.adminRequired === "1" ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              管理后台仅对管理员账号开放。游客和普通登录用户不受影响，可继续使用主要功能。
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 rounded-lg bg-[#191919] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              开始做题
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/notes"
              className="inline-flex items-center gap-2 rounded-lg border border-[#e2e2df] bg-white px-4 py-2.5 text-sm font-medium text-[#37352f] transition-colors hover:bg-[#f7f7f5]"
            >
              浏览知识库
            </Link>
          </div>
        </section>

        <section className="md:min-h-0 md:flex-1">
          <div className="grid gap-4 md:h-full md:grid-cols-3">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex h-full min-h-[180px] flex-col rounded-xl border border-[#e9e9e7] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#d5d5d2] hover:shadow-[0_6px_22px_rgba(15,15,15,0.06)]"
                >
                  <p className="text-xs font-medium text-[#9b9a97]">{item.label}</p>
                  <div className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#ececeb] bg-[#fbfbfa] text-[#4b4a47]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#191919]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#5f5e5b]">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
