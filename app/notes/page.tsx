import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { interviewNotes } from "@/lib/content";

export default function NotesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">八股文</h1>
          <p className="mt-2 text-sm text-muted-foreground">按面试真实问法整理，便于你直接输出结构化回答。</p>
        </div>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          返回首页
        </Link>
      </div>

      <div className="grid gap-4">
        {interviewNotes.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.digest}</CardDescription>
            </CardHeader>
            <CardContent className="mt-0 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
