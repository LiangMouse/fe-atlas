"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTE_TYPES, type NoteType } from "@/lib/note-types";
import type { InterviewNote } from "@/lib/notes";
import { cn } from "@/lib/utils";

function isNoteType(value: string | null): value is NoteType {
  return !!value && NOTE_TYPES.includes(value as NoteType);
}

function LoadingList() {
  return (
    <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="mt-3 h-7 w-64" />
          </CardHeader>
          <CardContent className="mt-0 flex flex-wrap gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const NOTE_CARD_BORDER_CLASS: Record<NoteType, string> = {
  计算机网络: "border-cyan-200 hover:border-cyan-300 hover:bg-cyan-50/40",
  JavaScript: "border-amber-200 hover:border-amber-300 hover:bg-amber-50/40",
  TypeScript: "border-blue-200 hover:border-blue-300 hover:bg-blue-50/40",
  React: "border-sky-200 hover:border-sky-300 hover:bg-sky-50/40",
  Vue: "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/40",
  CSS: "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/40",
  浏览器: "border-purple-200 hover:border-purple-300 hover:bg-purple-50/40",
  前端工程化: "border-orange-200 hover:border-orange-300 hover:bg-orange-50/40",
  场景: "border-pink-200 hover:border-pink-300 hover:bg-pink-50/40",
  AI: "border-violet-200 hover:border-violet-300 hover:bg-violet-50/40",
  全栈: "border-teal-200 hover:border-teal-300 hover:bg-teal-50/40",
  综合: "border-slate-300 hover:border-slate-400 hover:bg-slate-50/70",
};

export function NotesPageClient() {
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<InterviewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/notes", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || "加载八股文失败");
        }
        if (!cancelled) {
          setNotes((json.notes as InterviewNote[]) ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载八股文失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeType = isNoteType(searchParams.get("type")) ? searchParams.get("type") : "all";

  const categories = useMemo(
    () => [
      { key: "all", label: "全部", count: notes.length },
      ...NOTE_TYPES.map((type) => ({
        key: type,
        label: type,
        count: notes.filter((note) => note.noteType === type).length,
      })),
    ],
    [notes],
  );

  const filteredNotes =
    activeType === "all" ? notes : notes.filter((item) => item.noteType === activeType);

  const activeLabel = categories.find((item) => item.key === activeType)?.label ?? "全部";

  return (
    <main className="mx-auto h-full w-full max-w-[1680px] overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-300/80 bg-white/80 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">八股文</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              按真实面试问题整理，支持按类型快速筛选，便于针对性复习和面试前冲刺。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            返回首页
          </Link>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-300/80 bg-white/80 p-3 backdrop-blur-sm lg:sticky lg:top-24">
          <p className="mb-3 px-2 text-xs font-semibold tracking-wide text-slate-500">八股文类型</p>
          <nav className="space-y-1">
            {categories.map((category) => {
              const selected = category.key === activeType;
              const href = category.key === "all" ? "/notes" : `/notes?type=${encodeURIComponent(category.key)}`;
              return (
                <Link
                  key={category.key}
                  href={href}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    selected
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span className="font-medium">{category.label}</span>
                  <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
                    {category.count}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white/80 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-slate-900">{activeLabel}</p>
            <p className="mt-0.5 text-xs text-slate-500">共 {filteredNotes.length} 篇</p>
          </div>

          {loading ? <LoadingList /> : null}

          {!loading ? (
            <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
              {error ? (
                <Card>
                  <CardHeader>
                    <CardTitle>加载失败</CardTitle>
                    <p className="text-sm text-slate-500">{error}</p>
                  </CardHeader>
                </Card>
              ) : null}

              {!error
                ? filteredNotes.map((item) => (
                    <Link
                      key={item.id}
                      href={`/notes/${item.noteTypeSlug}/${item.noteSlug}`}
                      className="block focus-visible:outline-none"
                    >
                      <Card
                        className={cn(
                          "cursor-pointer border shadow-sm transition-all focus-within:ring-2 focus-within:ring-slate-300/80 hover:-translate-y-0.5 hover:shadow-md",
                          NOTE_CARD_BORDER_CLASS[item.noteType],
                        )}
                      >
                        <CardHeader>
                          <div className="mb-2">
                            <Badge variant="outline">{item.noteType}</Badge>
                          </div>
                          <CardTitle>{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="mt-0 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                : null}

              {!error && filteredNotes.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>当前类型暂无内容</CardTitle>
                    <p className="text-sm text-slate-500">请切换类型，或到管理员后台创建并发布该类型内容。</p>
                  </CardHeader>
                </Card>
              ) : null}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
