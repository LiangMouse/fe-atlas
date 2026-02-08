import { logServerError } from "@/lib/logger";
import { ensureValidNoteSlug, noteTypeToRouteSlug } from "@/lib/note-route";
import { resolveNoteType, type NoteType } from "@/lib/note-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";

export type InterviewNote = {
  id: number;
  title: string;
  noteType: NoteType;
  noteSlug: string;
  noteTypeSlug: string;
  digest: string;
  tags: string[];
  content: string;
  createdAt: string;
};

type RawInterviewNote = {
  id: number;
  title: string;
  note_type?: string | null;
  note_slug?: string | null;
  digest: string;
  tags: string[] | null;
  content: string | null;
  created_at: string;
};

export function normalizeInterviewNote(item: RawInterviewNote): InterviewNote {
  const content = (item.content ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/[ \t]*\\$/gm, "");

  const noteType = resolveNoteType(
    item.note_type,
    `${item.title}\n${item.digest}\n${item.tags?.join(" ") ?? ""}\n${content}`,
  );

  return {
    id: item.id,
    title: item.title,
    noteType,
    noteSlug: ensureValidNoteSlug(item.note_slug ?? "", `note-${item.id}`),
    noteTypeSlug: noteTypeToRouteSlug(noteType),
    digest: item.digest,
    tags: item.tags ?? [],
    content,
    createdAt: item.created_at,
  };
}

export async function getPublishedNotes() {
  if (!isSupabaseConfigured) {
    return [] as InterviewNote[];
  }

  try {
    const supabase = createPublicClient();
    const query = supabase
      .from("admin_notes")
      .select("id,title,note_type,note_slug,digest,tags,content,created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    const first = await query;
    let data = (first.data ?? []) as Array<Record<string, unknown>>;
    let error = first.error;

    // Backward-compatible fallback when note_type column is not present yet.
    if (error?.message?.includes("note_type")) {
      const fallback = await supabase
        .from("admin_notes")
        .select("id,title,note_slug,digest,tags,content,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      data = (fallback.data ?? []) as Array<Record<string, unknown>>;
      error = fallback.error;
    }

    if (error) {
      logServerError("notes.getPublishedNotes", error);
      return [] as InterviewNote[];
    }

    return data.map((item) => normalizeInterviewNote(item as RawInterviewNote));
  } catch (error) {
    logServerError("notes.getPublishedNotes", error);
    return [] as InterviewNote[];
  }
}

export async function getPublishedNoteById(id: number) {
  if (!isSupabaseConfigured) {
    return null as InterviewNote | null;
  }

  try {
    const supabase = createPublicClient();
    const query = supabase
      .from("admin_notes")
      .select("id,title,note_type,note_slug,digest,tags,content,created_at")
      .eq("is_published", true)
      .eq("id", id)
      .maybeSingle();
    const first = await query;
    let data = first.data as Record<string, unknown> | null;
    let error = first.error;

    // Backward-compatible fallback when note_type column is not present yet.
    if (error?.message?.includes("note_type")) {
      const fallback = await supabase
        .from("admin_notes")
        .select("id,title,note_slug,digest,tags,content,created_at")
        .eq("is_published", true)
        .eq("id", id)
        .maybeSingle();
      data = fallback.data as Record<string, unknown> | null;
      error = fallback.error;
    }

    if (error) {
      logServerError("notes.getPublishedNoteById", error);
      return null as InterviewNote | null;
    }

    if (!data) {
      return null as InterviewNote | null;
    }

    return normalizeInterviewNote(data as RawInterviewNote);
  } catch (error) {
    logServerError("notes.getPublishedNoteById", error);
    return null as InterviewNote | null;
  }
}

export async function getPublishedNoteByRoute(type: NoteType, noteSlug: string) {
  if (!isSupabaseConfigured) {
    return null as InterviewNote | null;
  }

  try {
    const supabase = createPublicClient();
    const query = supabase
      .from("admin_notes")
      .select("id,title,note_type,note_slug,digest,tags,content,created_at")
      .eq("is_published", true)
      .eq("note_type", type)
      .eq("note_slug", noteSlug)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const first = await query;
    let data = first.data as Record<string, unknown> | null;
    let error = first.error;

    if (error?.message?.includes("note_slug") || error?.message?.includes("note_type")) {
      // Fallback: at least keep detail route available by fuzzy matching title content.
      const fallback = await supabase
        .from("admin_notes")
        .select("id,title,note_type,digest,tags,content,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      const matched = (fallback.data as RawInterviewNote[] | null)?.find((item) => {
        const normalized = normalizeInterviewNote(item);
        return normalized.noteType === type && normalized.noteSlug === noteSlug;
      });
      data = (matched as Record<string, unknown> | undefined) ?? null;
      error = fallback.error;
    }

    if (error) {
      logServerError("notes.getPublishedNoteByRoute", error, { type, noteSlug });
      return null as InterviewNote | null;
    }

    if (!data) {
      return null as InterviewNote | null;
    }

    return normalizeInterviewNote(data as RawInterviewNote);
  } catch (error) {
    logServerError("notes.getPublishedNoteByRoute", error, { type, noteSlug });
    return null as InterviewNote | null;
  }
}
