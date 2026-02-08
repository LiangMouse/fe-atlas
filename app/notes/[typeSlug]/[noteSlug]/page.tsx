import Link from "next/link";
import { notFound } from "next/navigation";

import { NoteMarkdownPreview } from "@/components/notes/note-markdown-preview";
import { Badge } from "@/components/ui/badge";
import { routeSlugToNoteType } from "@/lib/note-route";
import { getPublishedNoteByRoute } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ typeSlug: string; noteSlug: string }>;
}) {
  const { typeSlug, noteSlug } = await params;
  const noteType = routeSlugToNoteType(typeSlug);
  if (!noteType) {
    notFound();
  }

  const note = await getPublishedNoteByRoute(noteType, noteSlug);
  if (!note) {
    notFound();
  }

  return (
    <main className="mx-auto h-full w-full max-w-[1680px] overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-300/80 bg-white/80 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-3">
              <Badge variant="outline">{note.noteType}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{note.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Link
            href={`/notes?type=${encodeURIComponent(note.noteType)}`}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            返回列表
          </Link>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-300/80 bg-white/80 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <NoteMarkdownPreview source={note.content} />
      </section>
    </main>
  );
}
