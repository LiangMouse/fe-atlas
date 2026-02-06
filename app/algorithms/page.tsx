import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { algorithmSets } from "@/lib/content";

export default function AlgorithmsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">算法</h1>
          <p className="mt-2 text-sm text-muted-foreground">先掌握套路，再刷题。每个专题都强调模板与复杂度分析。</p>
        </div>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          返回首页
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {algorithmSets.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.digest}</CardDescription>
            </CardHeader>
            <CardContent className="mt-0 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
