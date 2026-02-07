"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Code2, Play, UserRound } from "lucide-react";
import type { Monaco } from "@monaco-editor/react";

import type { PracticeQuestion, PracticeQuestionNavItem } from "@/lib/questions";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type RunState = {
  passed: number;
  total: number;
  checks: boolean[];
  error?: string;
};

type LeftTab = "description" | "solution" | "submission";

async function runChallengeCode(code: string, testScript: string): Promise<RunState> {
  const executor = new Function(
    `"use strict"; return (async () => {\n${code}\n${testScript}\n})();`,
  ) as () => Promise<RunState>;
  return executor();
}

function setupMonaco(monaco: Monaco) {
  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    typeRoots: ["node_modules/@types"],
  };

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
}

export function QuestionWorkspace({
  challenge,
  relatedChallenges,
}: {
  challenge: PracticeQuestion;
  relatedChallenges: PracticeQuestionNavItem[];
}) {
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [code, setCode] = useState(challenge.starterCode);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const editorLanguage = useMemo(
    () => (challenge.category === "TypeScript" ? "typescript" : "javascript"),
    [challenge.category],
  );

  useEffect(() => {
    setCode(challenge.starterCode);
    setRunState(null);
  }, [challenge.slug, challenge.starterCode]);

  const execute = async () => {
    setIsRunning(true);
    try {
      const result = await runChallengeCode(code, challenge.testScript);
      setRunState(result);
    } catch (error) {
      setRunState({
        passed: 0,
        total: 0,
        checks: [],
        error: error instanceof Error ? error.message : "未知运行错误",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="px-4 pb-4 sm:px-6 lg:px-8">
      <section className="mx-auto mb-4 max-w-[1680px] rounded-2xl border border-slate-300/75 bg-white/75 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500 sm:text-sm">
            <Link href="/questions" className="font-medium transition-colors hover:text-slate-900">
              题库
            </Link>
            <span>/</span>
            <span className="truncate text-slate-700">{challenge.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              可练习
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              Practice Mode
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="flex min-h-[calc(100vh-190px)] flex-col overflow-hidden rounded-2xl border border-slate-300/80 bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            {(["description", "solution", "submission"] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeftTab(tab)}
                className={`cursor-pointer rounded-md px-3 py-1.5 capitalize transition-colors ${
                  leftTab === tab
                    ? "bg-white text-slate-900 shadow-[inset_0_0_0_1px_#cbd5e1]"
                    : "text-slate-500 hover:bg-white hover:text-slate-700"
                }`}
              >
                {tab === "description" ? "描述" : tab === "solution" ? "解决方案" : "提交"}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-6 overflow-auto p-6 sm:p-7">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{challenge.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" />
                  前端面试题
                </div>
                <div className="flex items-center gap-1.5">
                  <Code2 className="h-4 w-4" />
                  {challenge.category}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {challenge.duration}
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {challenge.solvedCount}
                </div>
              </div>
            </div>

            {leftTab === "description" ? (
              <>
                {challenge.description.map((paragraph) => (
                  <p key={paragraph} className="text-[16px] leading-8 text-slate-700">
                    {paragraph}
                  </p>
                ))}

                <div>
                  <h2 className="mb-3 text-2xl font-semibold text-slate-900">例子</h2>
                  <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-sm leading-7 text-slate-100">
                    <code>{challenge.example}</code>
                  </pre>
                </div>
              </>
            ) : null}

            {leftTab === "solution" ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  参考答案用于学习对照，建议先自行完成后再查看。
                </div>
                <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-sm leading-7 text-slate-100">
                  <code>{challenge.referenceSolution}</code>
                </pre>
              </div>
            ) : null}

            {leftTab === "submission" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                暂无历史提交。点击右下角“运行”通过样例后，再接入提交记录。
              </div>
            ) : null}
          </div>
        </article>

        <article className="flex min-h-[calc(100vh-190px)] flex-col overflow-hidden rounded-2xl border border-slate-300/80 bg-slate-950 shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1 text-slate-100">代码</span>
              <span className="rounded-md px-3 py-1 text-slate-400">测试用例</span>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={editorLanguage}
              value={code}
              beforeMount={setupMonaco}
              onChange={(value) => setCode(value ?? "")}
              theme="vs-dark"
              loading={<div className="p-4 text-sm text-slate-400">编辑器加载中...</div>}
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 24,
                fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
                tabSize: 2,
                insertSpaces: true,
                wordWrap: "on",
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: true,
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "smart",
                inlineSuggest: { enabled: true },
                scrollBeyondLastLine: false,
                padding: { top: 14, bottom: 14 },
                smoothScrolling: true,
              }}
            />
          </div>

          <div className="border-t border-slate-700 bg-slate-900/95 px-4 py-3">
            <div className="mb-2 text-sm font-medium text-slate-300">Run tests / Console</div>
            <div className="min-h-16 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              {runState?.error ? `运行失败: ${runState.error}` : null}
              {!runState?.error && runState
                ? `通过 ${runState.passed}/${runState.total} 个测试`
                : "点击运行后展示测试结果"}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200">
                {challenge.level}
              </span>
              <span>{challenge.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCode(challenge.starterCode)}
                className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                重置
              </button>
              <button
                type="button"
                onClick={execute}
                disabled={isRunning}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Play className="h-4 w-4" />
                {isRunning ? "运行中" : "运行"}
              </button>
            </div>
          </div>
        </article>
      </section>

      <aside className="mx-auto mt-4 flex max-w-[1680px] flex-wrap items-center gap-2">
        {relatedChallenges.map((item) => (
          <Link
            key={item.slug}
            href={`/questions/${item.slug}`}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs transition-colors ${
              item.slug === challenge.slug
                ? "border-slate-400 bg-white text-slate-900"
                : "border-slate-300 bg-white/60 text-slate-500 hover:bg-white hover:text-slate-700"
            }`}
          >
            {item.title}
          </Link>
        ))}
      </aside>
    </div>
  );
}
