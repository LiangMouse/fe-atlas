"use client";

import MarkdownPreview from "@uiw/react-markdown-preview";

export function NoteMarkdownPreview({ source }: { source: string }) {
  return (
    <div data-color-mode="light" className="description-markdown p-5 sm:p-7">
      <MarkdownPreview
        source={source}
        wrapperElement={{ "data-color-mode": "light" }}
        className="!bg-transparent !p-0 text-slate-700"
      />
    </div>
  );
}
