import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas FE",
  description: "前端面试复习社区：八股文、算法、前端手写与在线练习",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_8%_5%,_#f5f8ff_0%,_#edf2ff_35%,_#e4ebfa_70%,_#dce4f7_100%)]" />
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-52 bg-linear-to-b from-white/70 via-white/35 to-transparent" />

        <header className="sticky top-0 z-40 border-b border-slate-200/85 bg-white/78 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              <Link href="/" className="group inline-flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-slate-900 to-slate-700 text-sm font-bold text-white shadow-md shadow-slate-600/25 transition-transform group-hover:-translate-y-0.5">
                  A
                </span>
                <span className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base">Atlas FE</span>
              </Link>

              <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
                <Link href="/questions" className="transition-colors hover:text-slate-900">
                  题库
                </Link>
                <Link href="/notes" className="transition-colors hover:text-slate-900">
                  知识点
                </Link>
                <Link href="/algorithms" className="transition-colors hover:text-slate-900">
                  算法
                </Link>
              </nav>
            </div>

            <Link
              href="/"
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 sm:text-sm"
            >
              回到首页
            </Link>
          </div>
        </header>

        <main className="w-full px-0 pb-8 pt-4 sm:pt-6">{children}</main>

        <Link
          href="/"
          aria-label="返回首页"
          className="fixed right-4 bottom-5 z-40 rounded-full border border-slate-300 bg-white/96 px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur transition-colors hover:bg-slate-50 sm:right-6 sm:bottom-6 sm:text-sm"
        >
          首页
        </Link>
      </body>
    </html>
  );
}
