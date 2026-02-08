import { Suspense } from "react";

import { NotesPageClient } from "@/components/notes/notes-page-client";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesPageClient />
    </Suspense>
  );
}
