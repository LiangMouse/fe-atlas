import Link from "next/link";
import { BookMarked, Braces, Code2, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "八股文",
    description: "高频知识点按面试场景整理，快速建立答题结构。",
    href: "/notes",
    icon: BookMarked,
  },
  {
    title: "算法",
    description: "按题型拆分模板与套路，聚焦前端面试常见算法题。",
    href: "/algorithms",
    icon: Trophy,
  },
  {
    title: "前端手写",
    description: "内置 Web IDE，支持编译执行并即时验证样例。",
    href: "/handwrite",
    icon: Code2,
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-white/70 bg-card/85 px-6 py-10 shadow-[0_18px_60px_-28px_rgba(2,6,23,0.3)] backdrop-blur sm:px-10">
        <div className="mb-5 flex items-center gap-2">
          <Badge>Atlas FE 社区</Badge>
          <Badge variant="outline">面试复习</Badge>
        </div>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          我们做一个前端开发者最喜欢的面试复习社区。
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          首页保持简约直接：打开就能进入八股文、算法和前端手写练习，减少无效浏览，专注提升面试通过率。
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/handwrite">
            <Button size="lg">马上练手写</Button>
          </Link>
          <Link href="/notes">
            <Button size="lg" variant="outline">
              先过八股文
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="group cursor-pointer">
              <Card className="h-full transition-transform duration-200 group-hover:-translate-y-1">
                <CardHeader>
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="mt-0">
            <p className="text-2xl font-bold">300+</p>
            <p className="text-sm text-muted-foreground">八股文知识卡片</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mt-0">
            <p className="text-2xl font-bold">120+</p>
            <p className="text-sm text-muted-foreground">前端高频算法题</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="mt-0">
            <p className="text-2xl font-bold">40+</p>
            <p className="text-sm text-muted-foreground">手写专题与样例</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-5 py-6">
        <div className="flex items-start gap-3">
          <Braces className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">MVP 状态</p>
            <p className="text-sm text-muted-foreground">
              已提供社区首页、内容板块和 Web IDE 样例执行。下一步可接入真实题库、登录和评论互动。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
