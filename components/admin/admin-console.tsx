"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookText, FileCode2, RefreshCcw, Trash2, Users, WandSparkles } from "lucide-react";

import {
  noteFormSchema,
  type OptimizeQuestionOutput,
  questionFormSchema,
  type NoteFormValues,
  type QuestionFormValues,
} from "@/lib/admin-schemas";

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
  digest: string;
  tags: string[];
  content: string;
  isPublished: boolean;
  createdAt: string;
};

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN");
}

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
  digest: "",
  tags: [],
  content: "",
  isPublished: false,
};

export function AdminConsole() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [optimizingQuestion, setOptimizingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [questionPromptDraft, setQuestionPromptDraft] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

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

  async function optimizeQuestionByAI() {
    const values = questionForm.getValues();
    const prompt = questionPromptDraft.trim() || [
      values.title,
      values.description,
      values.starterCode,
      values.testScript,
      values.referenceSolution,
    ].filter(Boolean).join("\n\n");

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
      if (!response.ok) {
        throw new Error(json.error || "AI 优化失败");
      }

      const result = json.result as OptimizeQuestionOutput;

      questionForm.setValue("title", result.title, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("slug", result.slug, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("description", result.description, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("starterCode", result.starterCode, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("testScript", result.testScript, { shouldDirty: true, shouldValidate: true });
      questionForm.setValue("referenceSolution", result.referenceSolution, { shouldDirty: true, shouldValidate: true });
      if (result.level) {
        questionForm.setValue("level", result.level, { shouldDirty: true, shouldValidate: true });
      }
      if (result.category) {
        questionForm.setValue("category", result.category, { shouldDirty: true, shouldValidate: true });
      }
      if (result.duration) {
        questionForm.setValue("duration", result.duration, { shouldDirty: true, shouldValidate: true });
      }

      setNotice("AI 已完成优化并回填表单，请检查后保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 优化失败");
    } finally {
      setOptimizingQuestion(false);
    }
  }

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

  async function deleteQuestion(id: number) {
    if (!window.confirm("确认删除该题目？")) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "删除题目失败");
      setNotice("题目已删除");
      if (editingQuestionId === id) resetQuestionForm();
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除题目失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(id: number) {
    if (!window.confirm("确认删除该八股文？")) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "删除八股文失败");
      setNotice("八股文已删除");
      if (editingNoteId === id) resetNoteForm();
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
    try {
      const response = await fetch(`/api/admin/notes/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !item.isPublished }),
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
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]" data-color-mode="light">
      <aside className="rounded-xl border border-[#e9e9e7] bg-white p-3">
        <p className="px-2 py-1 text-xs font-medium text-[#8f8e8a]">Admin Sections</p>
        <div className="mt-2 space-y-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setNotice(null);
                  setError(null);
                  setTab(item.id);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? "bg-[#f5f5f4] text-[#191919]" : "text-[#6f6e69] hover:bg-[#fafaf9]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-xl border border-[#e9e9e7] bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#191919]">
            {tab === "users" ? "用户列表" : tab === "questions" ? "题目管理" : "八股文管理"}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (tab === "users") void loadUsers();
              if (tab === "questions") void loadQuestions();
              if (tab === "notes") void loadNotes();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e4e4e2] px-3 py-1.5 text-xs text-[#5f5e5b] hover:bg-[#f7f7f5]"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> 刷新
          </button>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {notice ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
        ) : null}

        {tab === "users" ? (
          <div className="overflow-hidden rounded-lg border border-[#ececeb]">
            <table className="w-full text-sm">
              <thead className="bg-[#fafaf9] text-left text-xs text-[#8f8e8a]">
                <tr>
                  <th className="px-3 py-2">邮箱</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">注册时间</th>
                  <th className="px-3 py-2">最近登录</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[#f0f0ee] text-[#4f4f4d]">
                    <td className="px-3 py-2">{user.email || user.id}</td>
                    <td className="px-3 py-2">{user.providers.join(", ") || "-"}</td>
                    <td className="px-3 py-2">{formatTime(user.created_at)}</td>
                    <td className="px-3 py-2">{formatTime(user.last_sign_in_at)}</td>
                  </tr>
                ))}
                {users.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[#8f8e8a]">
                      暂无用户数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "questions" ? (
          <div className="space-y-4">
            <form onSubmit={submitQuestion} className="grid gap-3 rounded-lg border border-[#ececeb] bg-[#fafaf9] p-4">
              <div className="grid gap-2 rounded-lg border border-dashed border-[#dddcd8] bg-white p-3">
                <p className="text-xs font-medium text-[#6f6e69]">AI 一键优化</p>
                <textarea
                  value={questionPromptDraft}
                  onChange={(event) => setQuestionPromptDraft(event.target.value)}
                  placeholder="粘贴模糊题目草稿（可含描述/代码片段/示例），AI 会自动补全清晰题目描述、两个示例、模板代码和测试用例。"
                  className="min-h-24 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#8f8e8a]">若上方留空，会基于当前表单已填内容优化。</p>
                  <button
                    type="button"
                    onClick={() => void optimizeQuestionByAI()}
                    disabled={optimizingQuestion}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#d8d8d4] bg-white px-3 py-1.5 text-xs font-medium text-[#4f4f4d] hover:bg-[#f7f7f5] disabled:opacity-60"
                  >
                    <WandSparkles className="h-3.5 w-3.5" />
                    {optimizingQuestion ? "优化中..." : "AI 一键优化"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input {...questionForm.register("title")} placeholder="题目标题" className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
                <input {...questionForm.register("slug")} placeholder="slug (e.g. my-question)" className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              </div>
              {(questionForm.formState.errors.title || questionForm.formState.errors.slug) ? (
                <p className="text-xs text-rose-600">{questionForm.formState.errors.title?.message || questionForm.formState.errors.slug?.message}</p>
              ) : null}

              <textarea {...questionForm.register("description")} placeholder="题目描述" className="min-h-20 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              {questionForm.formState.errors.description ? <p className="text-xs text-rose-600">{questionForm.formState.errors.description.message}</p> : null}

              <textarea {...questionForm.register("starterCode")} placeholder="题目原始代码" className="min-h-24 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              {questionForm.formState.errors.starterCode ? <p className="text-xs text-rose-600">{questionForm.formState.errors.starterCode.message}</p> : null}

              <textarea {...questionForm.register("testScript")} placeholder="测试脚本" className="min-h-24 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              {questionForm.formState.errors.testScript ? <p className="text-xs text-rose-600">{questionForm.formState.errors.testScript.message}</p> : null}

              <textarea {...questionForm.register("referenceSolution")} placeholder="参考答案（给用户学习）" className="min-h-28 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              {questionForm.formState.errors.referenceSolution ? <p className="text-xs text-rose-600">{questionForm.formState.errors.referenceSolution.message}</p> : null}

              <div className="grid gap-3 sm:grid-cols-4">
                <select {...questionForm.register("level")} className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none">
                  <option value="初级">初级</option>
                  <option value="中等">中等</option>
                  <option value="高级">高级</option>
                </select>
                <select {...questionForm.register("category")} className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none">
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                </select>
                <input {...questionForm.register("duration")} placeholder="时长（如 15 分钟）" className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none" />
                <label className="inline-flex items-center gap-2 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm text-[#5f5e5b]">
                  <input type="checkbox" {...questionForm.register("isPublished")} /> 发布
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" disabled={submitting} className="w-fit rounded-lg bg-[#191919] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60">{editingQuestionId ? "保存题目" : "新增题目"}</button>
                {editingQuestionId ? (
                  <button type="button" onClick={resetQuestionForm} className="rounded-lg border border-[#e2e2df] px-3 py-2 text-sm text-[#5f5e5b] hover:bg-[#f7f7f5]">取消编辑</button>
                ) : null}
              </div>
            </form>

            <div className="overflow-hidden rounded-lg border border-[#ececeb]">
              <table className="w-full text-sm">
                <thead className="bg-[#fafaf9] text-left text-xs text-[#8f8e8a]"><tr><th className="px-3 py-2">标题</th><th className="px-3 py-2">分类</th><th className="px-3 py-2">难度</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">操作</th></tr></thead>
                <tbody>
                  {questions.map((item) => (
                    <tr key={item.id} className="border-t border-[#f0f0ee] text-[#4f4f4d]">
                      <td className="px-3 py-2">{item.title}</td>
                      <td className="px-3 py-2">{item.category}</td>
                      <td className="px-3 py-2">{item.level}</td>
                      <td className="px-3 py-2">{item.isPublished ? "已发布" : "草稿"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => { setEditingQuestionId(item.id); questionForm.reset(item); }} className="rounded border border-[#dcdcd9] px-2 py-1 text-xs hover:bg-[#f7f7f5]">编辑</button>
                          <button type="button" onClick={() => void toggleQuestionPublish(item)} className="rounded border border-[#dcdcd9] px-2 py-1 text-xs hover:bg-[#f7f7f5]">{item.isPublished ? "转草稿" : "发布"}</button>
                          <button type="button" onClick={() => void deleteQuestion(item.id)} className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"><Trash2 className="h-3 w-3" />删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "notes" ? (
          <div className="space-y-4">
            <form onSubmit={submitNote} className="grid gap-3 rounded-lg border border-[#ececeb] bg-[#fafaf9] p-4">
              <input {...noteForm.register("title")} placeholder="八股文标题" className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              {noteForm.formState.errors.title ? <p className="text-xs text-rose-600">{noteForm.formState.errors.title.message}</p> : null}

              <textarea {...noteForm.register("digest")} placeholder="摘要" className="min-h-20 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]" />
              {noteForm.formState.errors.digest ? <p className="text-xs text-rose-600">{noteForm.formState.errors.digest.message}</p> : null}

              <Controller
                control={noteForm.control}
                name="tags"
                render={({ field }) => (
                  <input
                    value={field.value.join(", ")}
                    onChange={(e) => field.onChange(e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))}
                    placeholder="标签（逗号分隔）"
                    className="rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d9d9d6]"
                  />
                )}
              />

              <Controller
                control={noteForm.control}
                name="content"
                render={({ field }) => (
                  <MDEditor
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? "")}
                    preview="live"
                    height={260}
                    visibleDragbar={false}
                  />
                )}
              />

              <label className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#e2e2df] bg-white px-3 py-2 text-sm text-[#5f5e5b]">
                <input type="checkbox" {...noteForm.register("isPublished")} /> 发布
              </label>

              <div className="flex items-center gap-2">
                <button type="submit" disabled={submitting} className="w-fit rounded-lg bg-[#191919] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60">{editingNoteId ? "保存八股文" : "新增八股文"}</button>
                {editingNoteId ? (
                  <button type="button" onClick={resetNoteForm} className="rounded-lg border border-[#e2e2df] px-3 py-2 text-sm text-[#5f5e5b] hover:bg-[#f7f7f5]">取消编辑</button>
                ) : null}
              </div>
            </form>

            <div className="overflow-hidden rounded-lg border border-[#ececeb]">
              <table className="w-full text-sm">
                <thead className="bg-[#fafaf9] text-left text-xs text-[#8f8e8a]"><tr><th className="px-3 py-2">标题</th><th className="px-3 py-2">标签</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">创建时间</th><th className="px-3 py-2">操作</th></tr></thead>
                <tbody>
                  {notes.map((item) => (
                    <tr key={item.id} className="border-t border-[#f0f0ee] text-[#4f4f4d]">
                      <td className="px-3 py-2">{item.title}</td>
                      <td className="px-3 py-2">{item.tags.join(", ") || "-"}</td>
                      <td className="px-3 py-2">{item.isPublished ? "已发布" : "草稿"}</td>
                      <td className="px-3 py-2">{formatTime(item.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => { setEditingNoteId(item.id); noteForm.reset(item); }} className="rounded border border-[#dcdcd9] px-2 py-1 text-xs hover:bg-[#f7f7f5]">编辑</button>
                          <button type="button" onClick={() => void toggleNotePublish(item)} className="rounded border border-[#dcdcd9] px-2 py-1 text-xs hover:bg-[#f7f7f5]">{item.isPublished ? "转草稿" : "发布"}</button>
                          <button type="button" onClick={() => void deleteNote(item.id)} className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"><Trash2 className="h-3 w-3" />删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
