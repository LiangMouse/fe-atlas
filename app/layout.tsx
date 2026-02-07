import type { Metadata } from "next";
import Link from "next/link";
import { Github, Home } from "lucide-react";
import "./globals.css";
import { HiddenAuthEntry } from "@/components/hidden-auth-entry";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex h-dvh flex-col overflow-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_8%_5%,_#f5f8ff_0%,_#edf2ff_35%,_#e4ebfa_70%,_#dce4f7_100%)] dark:bg-[radial-gradient(circle_at_8%_5%,_#0f172a_0%,_#111827_40%,_#0b1222_72%,_#020617_100%)]" />
          <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-52 bg-linear-to-b from-white/70 via-white/35 to-transparent dark:from-slate-900/60 dark:via-slate-900/25 dark:to-transparent" />

          <header className="sticky top-0 z-40 border-b border-slate-200/85 bg-white/78 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80">
            <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-8">
                <Link href="/" className="group inline-flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-slate-900 to-slate-700 text-sm font-bold text-white shadow-md shadow-slate-600/25 transition-transform group-hover:-translate-y-0.5 dark:from-slate-200 dark:to-slate-400 dark:text-slate-900">
                    A
                  </span>
                  <span className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base dark:text-slate-100">Atlas FE</span>
                </Link>

                <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex dark:text-slate-300">
                  <Link href="/questions" className="transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                    题库
                  </Link>
                  <Link href="/notes" className="transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                    知识点
                  </Link>
                  <Link href="/algorithms" className="transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                    算法
                  </Link>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                >
                  <Home className="h-4 w-4 shrink-0" />
                  回到首页
                </Link>

                <a
                  href="https://github.com/liangmouse/fe-atlas"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Atlas FE GitHub 仓库"
                  className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Github className="h-4 w-4" />
                  <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] w-max max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    如果喜欢欢迎 star，有问题欢迎 issue
                  </span>
                </a>

                <ThemeToggle />
                <HiddenAuthEntry />
              </div>
            </div>
          </header>

          <main className="w-full min-h-0 flex-1 overflow-hidden">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
