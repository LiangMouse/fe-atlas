"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookText, FileCode2, RefreshCcw, Trash2, Users, WandSparkles } from "lucide-react";
import MarkdownPreview from "@uiw/react-markdown-preview";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  noteFormSchema,
  type OptimizeQuestionOutput,
  questionFormSchema,
  type NoteFormValues,
  type QuestionFormValues,
} from "@/lib/admin-schemas";
import { NOTE_TYPES, type NoteType } from "@/lib/note-types";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type AdminTab = "users" | "questions" | "notes";

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  providers: string[];
};

type AdminQuestion = {
  id: number;
  title: string;
  slug: string;
  description: string;
  starterCode: string;
  testScript: string;
  referenceSolution: string;
  level: "初级" | "中等" | "高级";
  category: "JavaScript" | "TypeScript";
  duration: string;
  isPublished: boolean;
  createdAt: string;
};

type AdminNote = {
  id: number;
  title: string;
  noteType: NoteType;
  noteSlug: string;
  tags: string[];
  content: string;
  isPublished: boolean;
  createdAt: string;
};

const defaultQuestionForm: QuestionFormValues = {
  title: "",
  slug: "",
  description: "",
  starterCode: "",
  testScript: "",
  referenceSolution: "",
  level: "中等",
  category: "JavaScript",
  duration: "15 分钟",
  isPublished: false,
};

const defaultNoteForm: NoteFormValues = {
  title: "",
  noteType: "综合",
  noteSlug: "",
  tags: [],
  content: "",
  isPublished: false,
};

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

function normalizeEscapedMarkdown(value: string) {
  return value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/[ \t]*\\$/gm, "");
}

function normalizeMarkdownForPreview(value: string) {
  return normalizeEscapedMarkdown(value)
    .replace(/([^\n])(\s\d+\.\s+\*\*)/g, "$1\n$2")
    .replace(/([^\n])(\s-\s+\*\*)/g, "$1\n$2")
    .replace(/(\n(?:[-*]|\d+\.)[^\n]*)\n(##\s)/g, "$1\n\n$2");
}

function toQuestionFormValues(item: AdminQuestion): QuestionFormValues {
  return {
    title: item.title,
    slug: item.slug,
    description: item.description,
    starterCode: item.starterCode,
    testScript: item.testScript,
    referenceSolution: item.referenceSolution,
    level: item.level,
    category: item.category,
    duration: item.duration,
    isPublished: item.isPublished,
  };
}

function toNoteFormValues(item: AdminNote): NoteFormValues {
  return {
    title: item.title,
    noteType: item.noteType,
    noteSlug: item.noteSlug,
    tags: item.tags,
    content: normalizeEscapedMarkdown(item.content),
    isPublished: item.isPublished,
  };
}

export function AdminConsole() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [optimizingQuestion, setOptimizingQuestion] = useState(false);
  const [optimizingNote, setOptimizingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [questionPromptDraft, setQuestionPromptDraft] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "question" | "note";
    id: number;
    title: string;
  } | null>(null);

  const tabs = useMemo(
    () => [
      { id: "users" as const, label: "用户", icon: Users },
      { id: "questions" as const, label: "题目", icon: FileCode2 },
      { id: "notes" as const, label: "八股文", icon: BookText },
    ],
    [],
  );

  const questionForm = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: defaultQuestionForm,
  });

  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: defaultNoteForm,
  });

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "获取用户失败");
      setUsers(json.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取用户失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/questions", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "获取题目失败");
      setQuestions(json.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取题目失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotes() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/notes", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "获取八股文失败");
      setNotes(json.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取八股文失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "users") void loadUsers();
    if (tab === "questions") void loadQuestions();
    if (tab === "notes") void loadNotes();
  }, [tab]);

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionPromptDraft("");
    questionForm.reset(defaultQuestionForm);
  };

  const resetNoteForm = () => {
    setEditingNoteId(null);
    noteForm.reset(defaultNoteForm);
  };

  const submitQuestion = questionForm.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const isEdit = editingQuestionId !== null;
      const response = await fetch(
        isEdit ? `/api/admin/questions/${editingQuestionId}` : "/api/admin/questions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "保存题目失败");

      setNotice(isEdit ? "题目已更新" : "题目已创建");
      resetQuestionForm();
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存题目失败");
    } finally {
      setSubmitting(false);
    }
  });

  const submitNote = noteForm.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const isEdit = editingNoteId !== null;
      const response = await fetch(
        isEdit ? `/api/admin/notes/${editingNoteId}` : "/api/admin/notes",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "保存八股文失败");

      setNotice(isEdit ? "八股文已更新" : "八股文已创建");
      resetNoteForm();
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存八股文失败");
    } finally {
      setSubmitting(false);
    }
  });

  async function optimizeQuestionByAI() {
    const values = questionForm.getValues();
    const prompt =
      questionPromptDraft.trim() ||
      [
        values.title,
        values.description,
        values.starterCode,
        values.testScript,
        values.referenceSolution,
      ]
        .filter(Boolean)
        .join("\n\n");

    if (!prompt) {
      setError("请先输入题目草稿，或先填写部分题目内容");
      return;
    }

    setOptimizingQuestion(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/questions/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "AI 填充失败");

      const result = json.result as OptimizeQuestionOutput;
      questionForm.setValue("title", result.title, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("slug", result.slug, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("description", result.description, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("starterCode", result.starterCode, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("testScript", result.testScript, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("referenceSolution", result.referenceSolution, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (result.level) {
        questionForm.setValue("level", result.level, { shouldDirty: true, shouldValidate: true });
      }
      if (result.category) {
        questionForm.setValue("category", result.category, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      if (result.duration) {
        questionForm.setValue("duration", result.duration, { shouldDirty: true, shouldValidate: true });
      }

      setNotice("AI 已完成题目回填，请检查后保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 填充失败");
    } finally {
      setOptimizingQuestion(false);
    }
  }

  async function optimizeNoteByAI() {
    const values = noteForm.getValues();
    if (!values.title.trim()) {
      setError("请先填写八股文标题");
      return;
    }

    setOptimizingNote(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/notes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          noteSlug: values.noteSlug || undefined,
          ...(values.noteType !== "综合" ? { noteType: values.noteType } : {}),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "AI 填充失败");

      const result = json.result as {
        noteType: NoteType;
        noteSlug?: string;
        tags: string[];
        content: string;
      };
      const draft = json.draft as { id: number } | undefined;
      noteForm.setValue("noteType", result.noteType, { shouldDirty: true, shouldValidate: true });
      if (result.noteSlug) {
        noteForm.setValue("noteSlug", result.noteSlug, { shouldDirty: true, shouldValidate: true });
      }
      noteForm.setValue("tags", result.tags, { shouldDirty: true, shouldValidate: true });
      noteForm.setValue("content", normalizeEscapedMarkdown(result.content), {
        shouldDirty: true,
        shouldValidate: true,
      });
      await loadNotes();
      if (draft?.id) {
        setEditingNoteId(draft.id);
      }

      setNotice("AI 已完成生成并自动保存为草稿，同时回填到编辑器");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 填充失败");
    } finally {
      setOptimizingNote(false);
    }
  }

  async function deleteQuestion(id: number) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "删除题目失败");

      setNotice("题目已删除");
      if (editingQuestionId === id) {
        resetQuestionForm();
      }
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除题目失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(id: number) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "删除八股文失败");

      setNotice("八股文已删除");
      if (editingNoteId === id) {
        resetNoteForm();
      }
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除八股文失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleQuestionPublish(item: AdminQuestion) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/questions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "更新状态失败");

      setNotice(!item.isPublished ? "题目已发布" : "题目已转为草稿");
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新状态失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleNotePublish(item: AdminNote) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/notes/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: !item.isPublished,
          noteType: item.noteType,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "更新状态失败");

      setNotice(!item.isPublished ? "八股文已发布" : "八股文已转为草稿");
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新状态失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        setTab(value as AdminTab);
        setError(null);
        setNotice(null);
      }}
      orientation="vertical"
      className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]"
      data-color-mode="light"
    >
      <aside className="h-fit rounded-2xl border border-slate-300/80 bg-white/80 p-3 backdrop-blur-sm lg:sticky lg:top-24">
        <p className="px-2 py-1 text-xs font-semibold tracking-wide text-slate-500">Admin Sections</p>
        <TabsList className="mt-2 h-fit w-full flex-col items-stretch gap-1 bg-transparent p-0">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="h-auto w-full cursor-pointer justify-start rounded-xl border border-transparent px-3 py-2 text-left text-sm text-slate-600 data-[state=active]:border-slate-300 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </aside>

      <section className="min-w-0 rounded-2xl border border-slate-300/80 bg-white/85 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {tab === "users" ? "用户列表" : tab === "questions" ? "前端手写" : "八股文管理"}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (tab === "users") void loadUsers();
              if (tab === "questions") void loadQuestions();
              if (tab === "notes") void loadNotes();
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> 刷新
          </button>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {notice ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        {tab === "users" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-3 py-2">邮箱</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">注册时间</th>
                  <th className="px-3 py-2">最近登录</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{user.email || user.id}</td>
                    <td className="px-3 py-2">{user.providers.join(", ") || "-"}</td>
                    <td className="px-3 py-2">{formatTime(user.created_at)}</td>
                    <td className="px-3 py-2">{formatTime(user.last_sign_in_at)}</td>
                  </tr>
                ))}
                {users.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      暂无用户数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "questions" ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">题目列表 ({questions.length})</p>
                <button
                  type="button"
                  onClick={resetQuestionForm}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  新建
                </button>
              </div>

              <ScrollArea className="h-[720px] pr-1">
                <div className="space-y-2">
                  {questions.map((item) => {
                  const active = item.id === editingQuestionId;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-2.5 ${
                        active ? "border-slate-300 bg-white" : "border-slate-200 bg-white/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestionId(item.id);
                          questionForm.reset(toQuestionFormValues(item));
                        }}
                        className="w-full text-left"
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category} · {item.level}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatTime(item.createdAt)}</p>
                      </button>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleQuestionPublish(item)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {item.isPublished ? "转草稿" : "发布"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({ kind: "question", id: item.id, title: item.title })
                          }
                          className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" /> 删除
                        </button>
                      </div>
                    </div>
                  );
                  })}

                  {questions.length === 0 && !loading ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                      暂无题目，点击右侧表单创建
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </aside>

            <form onSubmit={submitQuestion} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3">
                <p className="text-xs font-medium text-slate-600">AI 一键填充（题目）</p>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-500">题目草稿输入</span>
                  <Textarea
                    value={questionPromptDraft}
                    onChange={(event) => setQuestionPromptDraft(event.target.value)}
                    placeholder="粘贴模糊题目草稿（可含描述/代码片段/示例）"
                    className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">草稿留空时会基于当前表单内容补全。</p>
                  <button
                    type="button"
                    onClick={() => void optimizeQuestionByAI()}
                    disabled={optimizingQuestion}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <WandSparkles className="h-3.5 w-3.5" />
                    {optimizingQuestion ? "填充中..." : "AI 填充"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">题目标题</span>
                  <Input
                    {...questionForm.register("title")}
                    placeholder="例如：实现函数柯里化"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">题目 slug</span>
                  <Input
                    {...questionForm.register("slug")}
                    placeholder="例如：implement-curry"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              </div>

              {(questionForm.formState.errors.title || questionForm.formState.errors.slug) && (
                <p className="text-xs text-rose-600">
                  {questionForm.formState.errors.title?.message || questionForm.formState.errors.slug?.message}
                </p>
              )}

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">题目描述</span>
                <Textarea
                  {...questionForm.register("description")}
                  placeholder="题目说明、示例、限制与提示"
                  className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">题目模板代码</span>
                <Textarea
                  {...questionForm.register("starterCode")}
                  placeholder="候选人起始代码（含函数注解）"
                  className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">测试用例脚本</span>
                <Textarea
                  {...questionForm.register("testScript")}
                  placeholder="Jest 风格测试脚本"
                  className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">参考答案</span>
                <Textarea
                  {...questionForm.register("referenceSolution")}
                  placeholder="完整可运行实现 + 简短说明注释"
                  className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">难度</span>
                  <Controller
                    control={questionForm.control}
                    name="level"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="初级">初级</SelectItem>
                          <SelectItem value="中等">中等</SelectItem>
                          <SelectItem value="高级">高级</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">技术分类</span>
                  <Controller
                    control={questionForm.control}
                    name="category"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JavaScript">JavaScript</SelectItem>
                          <SelectItem value="TypeScript">TypeScript</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">建议时长</span>
                  <Input
                    {...questionForm.register("duration")}
                    placeholder="例如：15 分钟"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">发布状态</span>
                  <Controller
                    control={questionForm.control}
                    name="isPublished"
                    render={({ field }) => (
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        发布
                      </span>
                    )}
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {editingQuestionId ? "保存题目" : "新增题目"}
                </button>
                {editingQuestionId ? (
                  <button
                    type="button"
                    onClick={resetQuestionForm}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    取消编辑
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}

        {tab === "notes" ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">八股文列表 ({notes.length})</p>
                <button
                  type="button"
                  onClick={resetNoteForm}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  新建
                </button>
              </div>

              <ScrollArea className="h-[720px] pr-1">
                <div className="space-y-2">
                  {notes.map((item) => {
                  const active = item.id === editingNoteId;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-2.5 ${
                        active ? "border-slate-300 bg-white" : "border-slate-200 bg-white/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(item.id);
                          noteForm.reset(toNoteFormValues(item));
                        }}
                        className="w-full text-left"
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.noteType} · {item.tags.join(" / ") || "未设置标签"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">/{item.noteSlug}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatTime(item.createdAt)}</p>
                      </button>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleNotePublish(item)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {item.isPublished ? "转草稿" : "发布"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({ kind: "note", id: item.id, title: item.title })
                          }
                          className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" /> 删除
                        </button>
                      </div>
                    </div>
                  );
                  })}

                  {notes.length === 0 && !loading ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                      暂无八股文，点击右侧表单创建
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </aside>

            <form onSubmit={submitNote} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">标题</span>
                <div className="flex items-center gap-2">
                  <Input
                    {...noteForm.register("title")}
                    placeholder="八股文标题"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => void optimizeNoteByAI()}
                    disabled={optimizingNote}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <WandSparkles className="h-3.5 w-3.5" />
                    {optimizingNote ? "填充中..." : "AI 填充"}
                  </button>
                </div>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">八股文类型</span>
                <Controller
                  control={noteForm.control}
                  name="noteType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">详情页 slug</span>
                <Input
                  {...noteForm.register("noteSlug")}
                  placeholder="例如：https-diff-http"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <Controller
                control={noteForm.control}
                name="tags"
                render={({ field }) => (
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">标签</span>
                    <Input
                      value={field.value.join(", ")}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="逗号分隔，例如：浏览器,缓存,性能"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </label>
                )}
              />

              <div className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">正文（Markdown）</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Controller
                  control={noteForm.control}
                  name="content"
                  render={({ field }) => (
                    <MDEditor
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? "")}
                      preview="edit"
                      height={320}
                      visibleDragbar={false}
                    />
                  )}
                />

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                    预览
                  </div>
                  <div data-color-mode="light" className="admin-note-preview max-h-[320px] overflow-y-auto p-4">
                    <MarkdownPreview
                      source={normalizeMarkdownForPreview(noteForm.watch("content") ?? "")}
                      wrapperElement={{ "data-color-mode": "light" }}
                      className="!bg-transparent !p-0"
                    />
                  </div>
                </div>
              </div>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">发布状态</span>
                <Controller
                  control={noteForm.control}
                  name="isPublished"
                  render={({ field }) => (
                    <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      发布
                    </span>
                  )}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {editingNoteId ? "保存八股文" : "新增八股文"}
                </button>
                {editingNoteId ? (
                  <button
                    type="button"
                    onClick={resetNoteForm}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    取消编辑
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}
      </section>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `将删除「${pendingDelete.title}」，该操作不可撤销。`
                : "该操作不可撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                const target = pendingDelete;
                setPendingDelete(null);
                if (target.kind === "question") {
                  void deleteQuestion(target.id);
                } else {
                  void deleteNote(target.id);
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
