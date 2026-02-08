import { notFound, redirect } from "next/navigation";

import { getPublishedNoteById } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ typeSlug: string }>;
}) {
  const { typeSlug } = await params;
  const noteId = Number.parseInt(typeSlug, 10);
  if (!Number.isInteger(noteId) || noteId <= 0) {
    notFound();
  }

  const note = await getPublishedNoteById(noteId);
  if (!note) {
    notFound();
  }
  redirect(`/notes/${note.noteTypeSlug}/${note.noteSlug}`);
}
