export const NOTE_TYPES = [
  "计算机网络",
  "JavaScript",
  "TypeScript",
  "React",
  "Vue",
  "CSS",
  "浏览器",
  "前端工程化",
  "场景",
  "AI",
  "全栈",
  "综合"
] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

export const NOTE_TYPE_SET = new Set<string>(NOTE_TYPES);

export function normalizeNoteType(value: string | null | undefined): NoteType {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (NOTE_TYPE_SET.has(trimmed)) {
      return trimmed as NoteType;
    }

    const lower = trimmed.toLowerCase();
    if (/(^|\b)(http|https|tcp|udp|tls|ssl|dns|cdn|network)(\b|$)/.test(lower) || trimmed.includes("网络")) {
      return "计算机网络";
    }
    if (/(^|\b)(js|javascript|ecmascript)(\b|$)/.test(lower) || trimmed.includes("闭包") || trimmed.includes("事件循环")) {
      return "JavaScript";
    }
    if (/(^|\b)(ts|typescript)(\b|$)/.test(lower) || trimmed.includes("泛型")) {
      return "TypeScript";
    }
    if (lower.includes("react")) return "React";
    if (lower.includes("vue")) return "Vue";
    if (/(^|\b)(css|scss|less|style|styles)(\b|$)/.test(lower) || trimmed.includes("样式")) return "CSS";
    if (lower.includes("browser") || trimmed.includes("浏览器") || lower.includes("dom") || lower.includes("bom")) {
      return "浏览器";
    }
    if (
      trimmed.includes("工程化") ||
      trimmed === "工程化" ||
      lower.includes("vite") ||
      lower.includes("webpack") ||
      lower.includes("rollup") ||
      lower.includes("babel")
    ) {
      return "前端工程化";
    }
    if (trimmed.includes("场景") || trimmed.includes("实战")) return "场景";
    if (trimmed.includes("ai") || trimmed.includes("大模型") || lower.includes("llm")) return "AI";
    if (trimmed.includes("全栈") || lower.includes("fullstack")) return "全栈";
  }
  return "综合";
}

export function inferNoteTypeFromText(text: string): NoteType {
  const content = text.toLowerCase();
  const score: Record<NoteType, number> = {
    计算机网络: 0,
    JavaScript: 0,
    TypeScript: 0,
    React: 0,
    Vue: 0,
    CSS: 0,
    浏览器: 0,
    前端工程化: 0,
    场景: 0,
    AI: 0,
    全栈: 0,
    综合: 0,
  };

  const hit = (keys: string[], type: NoteType, weight = 1) => {
    for (const key of keys) {
      if (content.includes(key)) score[type] += weight;
    }
  };

  hit(["http", "https", "tcp", "udp", "tls", "ssl", "dns", "cdn", "网络", "缓存", "握手"], "计算机网络", 2);
  hit(["javascript", "js", "闭包", "原型", "事件循环", "promise"], "JavaScript", 2);
  hit(["typescript", "ts", "泛型", "infer", "类型守卫"], "TypeScript", 2);
  hit(["react", "hooks", "fiber", "jsx", "next.js"], "React", 2);
  hit(["vue", "pinia", "vuex", "composition api", "watch"], "Vue", 2);
  hit(["css", "scss", "less", "flex", "grid", "bfc", "样式", "布局"], "CSS", 2);
  hit(["浏览器", "render", "reflow", "repaint", "dom", "bom"], "浏览器", 2);
  hit(["工程化", "webpack", "vite", "rollup", "babel", "构建"], "前端工程化", 2);
  hit(["场景", "实战", "落地", "方案设计"], "场景", 2);
  hit(["ai", "llm", "大模型", "prompt", "agent", "rag"], "AI", 2);
  hit(["全栈", "fullstack", "node", "数据库", "后端"], "全栈", 1);

  let best: NoteType = "综合";
  for (const key of NOTE_TYPES) {
    if (score[key] > score[best]) best = key;
  }
  return best;
}

export function resolveNoteType(value: string | null | undefined, fallbackText: string): NoteType {
  const normalized = normalizeNoteType(value);
  if (normalized !== "综合") return normalized;
  return inferNoteTypeFromText(fallbackText);
}
