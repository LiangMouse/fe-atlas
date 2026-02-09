"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Code2, Play, UserRound } from "lucide-react";
import type { Monaco } from "@monaco-editor/react";
import { WebContainer } from "@webcontainer/api";
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import MarkdownPreview from "@uiw/react-markdown-preview";

import type { PracticeQuestion, PracticeQuestionNavItem } from "@/lib/questions";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type RunState = {
  passed: number;
  total: number;
  checks: boolean[];
  error?: string;
  cases?: { name: string; pass: boolean; error?: string }[];
  logs?: string[];
};

type LeftTab = "description" | "solution" | "submission";

const EXECUTION_TIMEOUT_MS = 20_000;
const DEFAULT_CONSOLE_PANEL_HEIGHT = 176;
const MIN_CONSOLE_PANEL_HEIGHT = 120;
const MIN_EDITOR_PANEL_HEIGHT = 220;
const RESIZE_HANDLE_HEIGHT = 8;
const PACKAGE_JSON = JSON.stringify(
  {
    name: "atlas-question-runtime",
    private: true,
    type: "module",
    devDependencies: {
      vitest: "4.0.18",
    },
  },
  null,
  2,
);

const VITEST_CONFIG = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests.spec.ts"],
    environment: "node",
    globals: true,
    watch: false,
    isolate: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 5000,
  },
});
`;

const VITEST_SETUP = `import { vi } from "vitest";
globalThis.jest = vi;
`;

type ParsedVitestCase = {
  name: string;
  pass: boolean;
  error?: string;
};

type RuntimeState = {
  bootPromise?: Promise<WebContainer>;
  container?: WebContainer;
  installPromise?: Promise<void>;
  installed?: boolean;
};

const VITEST_REPORT_PATH = ".atlas-vitest-report.json";

function getRuntimeState() {
  const globalScope = globalThis as typeof globalThis & {
    __atlasWebContainerRuntime?: RuntimeState;
  };
  if (!globalScope.__atlasWebContainerRuntime) {
    globalScope.__atlasWebContainerRuntime = {};
  }
  return globalScope.__atlasWebContainerRuntime;
}

function appendLog(logs: string[], chunk: string) {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "")
        .replace(/\[\?25[lh]/g, "")
        .trimEnd(),
    )
    .filter(Boolean);
  for (const line of lines) {
    if (line.includes("JSON report written to")) {
      continue;
    }
    logs.push(line);
  }
  if (logs.length > 300) {
    logs.splice(0, logs.length - 300);
  }
}

async function runProcess({
  container,
  command,
  args,
  logs,
  timeoutMs,
  cwd,
  env,
}: {
  container: WebContainer;
  command: string;
  args: string[];
  logs: string[];
  timeoutMs: number;
  cwd?: string;
  env?: Record<string, string | number | boolean>;
}) {
  const process = await container.spawn(command, args, {
    ...(cwd ? { cwd } : {}),
    ...(env ? { env } : {}),
  });
  const outputPromise = process.output.pipeTo(
    new WritableStream({
      write(data) {
        appendLog(logs, String(data));
      },
    }),
  );

  const timeout = window.setTimeout(() => {
    void process.kill();
    appendLog(logs, `[runtime] process timeout: ${command} ${args.join(" ")}`);
  }, timeoutMs);

  const exitCode = await process.exit;
  window.clearTimeout(timeout);
  await outputPromise.catch(() => undefined);
  return exitCode;
}

async function getWebContainer(logs: string[]) {
  const runtime = getRuntimeState();
  if (runtime.container) {
    return runtime.container;
  }

  if (!runtime.bootPromise) {
    runtime.bootPromise = WebContainer.boot()
      .then((container) => {
        runtime.container = container;
        return container;
      })
      .catch((error) => {
        runtime.bootPromise = undefined;
        throw error;
      });
  }

  try {
    return await runtime.bootPromise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SharedArrayBuffer")) {
      throw new Error(
        "当前环境不支持 WebContainer（需要 SharedArrayBuffer / cross-origin isolation）。请在本地开发环境运行。",
      );
    }
    appendLog(logs, `[runtime] webcontainer boot failed: ${message}`);
    throw error;
  }
}

async function writeRuntimeFiles({
  container,
  code,
  testScript,
}: {
  container: WebContainer;
  code: string;
  testScript: string;
}) {
  await container.fs.writeFile("package.json", PACKAGE_JSON);
  await container.fs.writeFile("vitest.config.ts", VITEST_CONFIG);
  await container.fs.writeFile("vitest.setup.ts", VITEST_SETUP);
  await container.fs.writeFile("solution.ts", code);
  await container.fs.writeFile("tests.spec.ts", testScript);
}

async function ensureInstalled(container: WebContainer, logs: string[]) {
  const runtime = getRuntimeState();
  if (runtime.installed) {
    return;
  }

  if (!runtime.installPromise) {
    runtime.installPromise = (async () => {
      appendLog(logs, "[runtime] installing dependencies...");
      const exitCode = await runProcess({
        container,
        command: "npm",
        args: ["install", "--no-fund", "--no-audit"],
        logs,
        timeoutMs: 90_000,
        cwd: ".",
      });
      if (exitCode !== 0) {
        throw new Error("依赖安装失败，请检查日志");
      }
      runtime.installed = true;
      appendLog(logs, "[runtime] dependencies ready");
    })().catch((error) => {
      runtime.installPromise = undefined;
      throw error;
    });
  }

  await runtime.installPromise;
}

function parseVitestReport(reportRaw: string, logs: string[]): RunState {
  type VitestAssertion = {
    fullName?: string;
    title?: string;
    status?: string;
    failureMessages?: string[];
  };

  type VitestFile = {
    assertionResults?: VitestAssertion[];
  };

  try {
    const parsed = JSON.parse(reportRaw) as {
      numTotalTests?: number;
      numPassedTests?: number;
      testResults?: VitestFile[];
    };
    const cases: ParsedVitestCase[] = [];

    for (const file of parsed.testResults ?? []) {
      for (const item of file.assertionResults ?? []) {
        cases.push({
          name: item.fullName || item.title || "Unnamed case",
          pass: item.status === "passed",
          error: item.failureMessages?.[0],
        });
      }
    }

    if (cases.length > 0) {
      const checks = cases.map((item) => item.pass);
      const passed = checks.filter(Boolean).length;
      return { passed, total: checks.length, checks, cases, logs };
    }

    const total = Number(parsed.numTotalTests) || 0;
    const passed = Number(parsed.numPassedTests) || 0;
    return { passed, total, checks: Array.from({ length: total }, (_, i) => i < passed), cases: [], logs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(logs, `[runtime] failed to parse vitest report: ${message}`);
    return { passed: 0, total: 0, checks: [], error: "测试结果解析失败", logs };
  }
}

async function runChallengeCode(code: string, testScript: string): Promise<RunState> {
  const logs: string[] = [];
  try {
    const container = await getWebContainer(logs);
    await writeRuntimeFiles({ container, code, testScript });
    await ensureInstalled(container, logs);
    try {
      await container.fs.rm(VITEST_REPORT_PATH);
    } catch {
      // Ignore if report does not exist.
    }

    const exitCode = await runProcess({
      container,
      command: "npx",
      args: ["vitest", "run", "--config", "vitest.config.ts", "--reporter=json", "--outputFile", VITEST_REPORT_PATH],
      logs,
      timeoutMs: EXECUTION_TIMEOUT_MS,
      cwd: ".",
      env: {
        CI: "1",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
    });

    let reportRaw = "";
    try {
      reportRaw = (await container.fs.readFile(VITEST_REPORT_PATH, "utf-8")) as string;
    } catch {
      return {
        passed: 0,
        total: 0,
        checks: [],
        error: "测试执行失败（未生成测试报告），请查看下方日志",
        logs,
      };
    }

    const result = parseVitestReport(reportRaw, logs);
    if (exitCode !== 0 && !result.error && result.total === 0) {
      return {
        ...result,
        error: "测试执行失败，请查看下方日志",
      };
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(logs, `[runtime] ${message}`);
    return {
      passed: 0,
      total: 0,
      checks: [],
      error: message || "运行失败",
      logs,
    };
  }
}

async function persistRuntimeLogs({
  slug,
  outcome,
  passed,
  total,
  logs,
  error,
}: {
  slug: string;
  outcome: "success" | "error";
  passed: number;
  total: number;
  logs: string[];
  error?: string;
}) {
  if (!logs.length && !error) {
    return;
  }

  try {
    await fetch("/api/internal/runtime-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug,
        outcome,
        passed,
        total,
        logs,
        ...(error ? { error } : {}),
      }),
    });
  } catch {
    // Ignore logging transport failures.
  }
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

function buildSandboxFiles(code: string) {
  return {
    "/App.jsx": code,
    "/index.js": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
`,
    "/styles.css": `body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
`,
  };
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
  const [sandboxRevision, setSandboxRevision] = useState(0);
  const [consolePanelHeight, setConsolePanelHeight] = useState(DEFAULT_CONSOLE_PANEL_HEIGHT);
  const [isResizingConsole, setIsResizingConsole] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const isSandboxMode = useMemo(
    () => challenge.category === "React" || challenge.category === "UI构建",
    [challenge.category],
  );
  const editorLanguage = "javascript";
  const sandboxFiles = useMemo(() => buildSandboxFiles(challenge.starterCode), [challenge.starterCode]);

  useEffect(() => {
    setCode(challenge.starterCode);
    setRunState(null);
    setSandboxRevision(0);
    setConsolePanelHeight(DEFAULT_CONSOLE_PANEL_HEIGHT);
  }, [challenge.slug, challenge.starterCode]);

  useEffect(() => {
    if (!isResizingConsole) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) {
        return;
      }

      const container = splitContainerRef.current;
      if (!container) {
        return;
      }

      const delta = resizeStateRef.current.startY - event.clientY;
      const next = resizeStateRef.current.startHeight + delta;
      const maxConsoleHeight = Math.max(
        MIN_CONSOLE_PANEL_HEIGHT,
        container.clientHeight - MIN_EDITOR_PANEL_HEIGHT - RESIZE_HANDLE_HEIGHT,
      );
      const clamped = Math.min(maxConsoleHeight, Math.max(MIN_CONSOLE_PANEL_HEIGHT, next));
      setConsolePanelHeight(clamped);
    };

    const onMouseUp = () => {
      setIsResizingConsole(false);
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingConsole]);

  const execute = async () => {
    setIsRunning(true);
    try {
      const result = await runChallengeCode(code, challenge.testScript);
      await persistRuntimeLogs({
        slug: challenge.slug,
        outcome: "success",
        passed: result.passed,
        total: result.total,
        logs: result.logs ?? [],
        error: result.error,
      });
      setRunState(result);
    } catch (error) {
      const withLogs = error as Error & { logs?: string[] };
      await persistRuntimeLogs({
        slug: challenge.slug,
        outcome: "error",
        passed: 0,
        total: 0,
        logs: Array.isArray(withLogs.logs) ? withLogs.logs : [],
        error: error instanceof Error ? error.message : "未知运行错误",
      });
      setRunState({
        passed: 0,
        total: 0,
        checks: [],
        error: error instanceof Error ? error.message : "未知运行错误",
        logs: Array.isArray(withLogs.logs) ? withLogs.logs : [],
      });
    } finally {
      setIsRunning(false);
    }
  };

  const startConsoleResize = (event: { preventDefault: () => void; clientY: number }) => {
    event.preventDefault();
    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: consolePanelHeight,
    };
    setIsResizingConsole(true);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <section className="mx-auto mb-3 w-full max-w-[1680px] shrink-0 rounded-2xl border border-slate-300/75 bg-white/75 px-4 py-3 backdrop-blur-sm sm:px-5">
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

      <section className="mx-auto grid min-h-0 w-full max-w-[1680px] flex-1 gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-300/80 bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
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

          <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-7">
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
              <div data-color-mode="light" className="description-markdown">
                <MarkdownPreview
                  source={challenge.description}
                  wrapperElement={{ "data-color-mode": "light" }}
                  className="!bg-transparent !p-0 text-slate-700"
                />
              </div>
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

        <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-300/80 bg-slate-950 shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1 text-slate-100">代码</span>
              <span className="rounded-md px-3 py-1 text-slate-400">测试用例</span>
            </div>
          </div>

          {isSandboxMode ? (
            <>
              <div className="relative flex-1 overflow-hidden">
                <SandpackProvider
                  key={`${challenge.slug}-${sandboxRevision}`}
                  template="react"
                  files={sandboxFiles}
                  theme="dark"
                  options={{
                    activeFile: "/App.jsx",
                    recompileMode: "immediate",
                    recompileDelay: 200,
                  }}
                >
                  <SandpackLayout className="!h-full !border-0 !bg-slate-950">
                    <SandpackCodeEditor
                      showLineNumbers
                      showTabs={false}
                      wrapContent
                      closableTabs={false}
                      style={{ height: "60%" }}
                    />
                    <div className="grid h-[40%] min-h-[220px] grid-cols-1 border-t border-slate-700 xl:grid-cols-2">
                      <div className="border-b border-slate-700 xl:border-b-0 xl:border-r">
                        <SandpackPreview
                          showNavigator
                          showOpenInCodeSandbox={false}
                          style={{ height: "100%" }}
                        />
                      </div>
                      <SandpackConsole
                        resetOnPreviewRestart
                        style={{ height: "100%", overflow: "auto" }}
                      />
                    </div>
                  </SandpackLayout>
                </SandpackProvider>
              </div>

              <div className="border-t border-slate-700 bg-slate-900/95 px-4 py-3">
                <div className="mb-2 text-sm font-medium text-slate-300">Live Preview</div>
                <div className="min-h-16 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                  React / UI 构建题已启用沙盒实时预览，代码变更会自动同步到预览窗口。
                </div>
              </div>
            </>
          ) : (
            <div
              ref={splitContainerRef}
              className="grid min-h-0 flex-1"
              style={{
                gridTemplateRows: `minmax(${MIN_EDITOR_PANEL_HEIGHT}px, 1fr) ${RESIZE_HANDLE_HEIGHT}px minmax(${MIN_CONSOLE_PANEL_HEIGHT}px, ${consolePanelHeight}px)`,
              }}
            >
              <div className="min-h-0 overflow-hidden">
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

              <button
                type="button"
                onMouseDown={startConsoleResize}
                className="group relative cursor-row-resize border-y border-slate-700 bg-slate-900/85"
                aria-label="调整控制台高度"
              >
                <span className="absolute inset-x-1/2 top-1/2 h-1 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/80 transition-colors group-hover:bg-emerald-400" />
              </button>

              <div className="border-t border-slate-700 bg-slate-900/95 px-4 py-3">
                <div className="mb-2 text-sm font-medium text-slate-300">Run tests / Console</div>
                <div className="min-h-16 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                  {runState ? (
                    <div className="space-y-2">
                      <div>
                        {runState.error
                          ? `运行失败: ${runState.error}`
                          : `通过 ${runState.passed}/${runState.total} 个测试`}
                      </div>
                      {runState.cases?.length ? (
                        <ul className="space-y-1 text-xs text-slate-300">
                          {runState.cases.map((item, index) => (
                            <li key={`${item.name}-${index}`}>
                              {item.pass ? "✓" : "✗"} {item.name}
                              {!item.pass && item.error ? `: ${item.error}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    "点击运行后展示测试结果"
                  )}
                </div>
              </div>
            </div>
          )}

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
                onClick={() => {
                  if (isSandboxMode) {
                    setSandboxRevision((value) => value + 1);
                    return;
                  }
                  setCode(challenge.starterCode);
                }}
                className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                重置
              </button>
              {!isSandboxMode ? (
                <button
                  type="button"
                  onClick={execute}
                  disabled={isRunning}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Play className="h-4 w-4" />
                  {isRunning ? "运行中" : "运行"}
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <aside className="mx-auto mt-3 flex w-full max-w-[1680px] shrink-0 items-center gap-2 overflow-x-auto pb-1">
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
