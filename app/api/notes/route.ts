import { NextResponse } from "next/server";

import { getPublishedNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  const notes = await getPublishedNotes();
  return NextResponse.json({ notes });
}
