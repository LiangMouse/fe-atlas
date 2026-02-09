import { z } from "zod";
import { NOTE_TYPES } from "@/lib/note-types";

export const questionLevelSchema = z.enum(["初级", "中等", "高级"]);
export const questionCategorySchema = z.enum(["JavaScript", "React", "UI构建"]);

export const questionFormSchema = z.object({
  title: z.string().trim().min(2, "题目标题至少 2 个字"),
  slug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符"),
  description: z.string().trim().min(10, "题目描述至少 10 个字"),
  starterCode: z.string().trim().min(5, "请填写题目原始代码"),
  testScript: z.string().trim().min(5, "请填写测试脚本"),
  referenceSolution: z.string().trim().min(10, "请填写参考答案"),
  level: questionLevelSchema,
  category: questionCategorySchema,
  duration: z.string().trim().min(2, "请填写建议时长"),
  isPublished: z.boolean(),
});

export const questionPatchSchema = questionFormSchema.partial();

export const optimizeQuestionInputSchema = z.object({
  prompt: z.string().trim().min(10, "请先输入待优化的题目草稿"),
});

export const optimizeQuestionOutputSchema = z.object({
  title: z.string().trim().min(2),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(20),
  starterCode: z.string().trim().min(5),
  testScript: z.string().trim().min(5),
  referenceSolution: z.string().trim().min(10),
  level: questionLevelSchema.optional(),
  category: questionCategorySchema.optional(),
  duration: z.string().trim().min(2).optional(),
});

export const optimizeNoteInputSchema = z.object({
  title: z.string().trim().min(2, "请先输入八股文标题"),
  noteType: z.enum(NOTE_TYPES).optional(),
  noteSlug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
});

export const optimizeNoteOutputSchema = z.object({
  noteType: z.enum(NOTE_TYPES),
  tags: z.array(z.string().trim().min(1)).min(3).max(6),
  memoryVersion: z.string().trim().min(20),
  detailedVersion: z.string().trim().min(40),
});

export const noteFormSchema = z.object({
  title: z.string().trim().min(2, "标题至少 2 个字"),
  noteType: z.enum(NOTE_TYPES, "请选择八股文类型"),
  noteSlug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符"),
  tags: z.array(z.string().trim().min(1)),
  content: z.string(),
  isPublished: z.boolean(),
});

export const notePatchSchema = noteFormSchema.partial();

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
export type NoteFormValues = z.infer<typeof noteFormSchema>;
export type OptimizeQuestionOutput = z.infer<typeof optimizeQuestionOutputSchema>;
export type OptimizeNoteOutput = z.infer<typeof optimizeNoteOutputSchema>;
