"use client";

import { useMemo, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { handwriteChallenges } from "@/lib/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type RunResult = {
  passed: boolean;
  message: string;
};

const emitterTest = `
const factory = createEmitter();
const arr = [];
const fn = (v) => arr.push(v);
factory.on("ping", fn);
factory.emit("ping", 1);
factory.off("ping", fn);
factory.emit("ping", 2);
return arr.length === 1 && arr[0] === 1;
`;

const debounceTest = `
return typeof debounce === "function" && typeof debounce(() => {}, 50) === "function";
`;

function runWithSandbox(code: string, expression: string): boolean {
  const wrapped = `"use strict";\n${code}\nreturn (() => { ${expression} })();`;
  return Boolean(new Function(wrapped)());
}

export function HandwriteIDE() {
  const [selectedId, setSelectedId] = useState(handwriteChallenges[0].id);
  const current = useMemo(
    () => handwriteChallenges.find((challenge) => challenge.id === selectedId) ?? handwriteChallenges[0],
    [selectedId],
  );
  const [code, setCode] = useState(current.starterCode);
  const [result, setResult] = useState<RunResult | null>(null);

  const runSamples = () => {
    try {
      const testExpr = current.id === "event-emitter" ? emitterTest : debounceTest;
      const passed = runWithSandbox(code, testExpr);
      setResult({
        passed,
        message: passed ? "样例通过：编译执行成功。" : "样例未通过，请检查实现逻辑。",
      });
    } catch (error) {
      setResult({
        passed: false,
        message: `编译或执行失败：${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  };

  const resetCode = () => {
    setCode(current.starterCode);
    setResult(null);
  };

  const switchChallenge = (id: string) => {
    const target = handwriteChallenges.find((item) => item.id === id);
    if (!target) return;
    setSelectedId(id);
    setCode(target.starterCode);
    setResult(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>题目列表</CardTitle>
          <CardDescription>选择题目后可直接在线编写并运行样例。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {handwriteChallenges.map((item) => {
            const active = item.id === current.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchChallenge(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/8" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <Badge variant={active ? "default" : "outline"}>{item.level}</Badge>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.prompt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-[360px] font-mono text-xs leading-6"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runSamples}>
              <Play className="mr-2 h-4 w-4" />
              编译并运行样例
            </Button>
            <Button type="button" variant="outline" onClick={resetCode}>
              <RotateCcw className="mr-2 h-4 w-4" />
              重置代码
            </Button>
          </div>
          {result ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                result.passed ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700"
              }`}
            >
              {result.message}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
