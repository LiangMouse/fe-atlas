import type { NoteType } from "@/lib/note-types";

const NOTE_TYPE_ROUTE_SLUG_MAP: Record<NoteType, string> = {
  计算机网络: "network",
  JavaScript: "javascript",
  TypeScript: "typescript",
  React: "react",
  Vue: "vue",
  CSS: "css",
  浏览器: "browser",
  前端工程化: "engineering",
  场景: "scenario",
  AI: "ai",
  全栈: "fullstack",
  综合: "general",
};

const ROUTE_SLUG_TO_NOTE_TYPE_MAP = Object.fromEntries(
  Object.entries(NOTE_TYPE_ROUTE_SLUG_MAP).map(([noteType, slug]) => [slug, noteType]),
) as Record<string, NoteType>;

export function noteTypeToRouteSlug(noteType: NoteType) {
  return NOTE_TYPE_ROUTE_SLUG_MAP[noteType];
}

export function routeSlugToNoteType(slug: string): NoteType | null {
  const normalized = slug.trim().toLowerCase();
  return ROUTE_SLUG_TO_NOTE_TYPE_MAP[normalized] ?? null;
}

export function normalizeNoteSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function ensureValidNoteSlug(value: string, fallback = "note") {
  const normalized = normalizeNoteSlug(value);
  return normalized || fallback;
}
