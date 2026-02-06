import Link from "next/link";

import { HandwriteIDE } from "@/components/handwrite-ide";

export default function HandwritePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">前端手写</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            在线 Web IDE：编写代码后可直接编译并执行样例，验证是否通过。
          </p>
        </div>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          返回首页
        </Link>
      </div>
      <HandwriteIDE />
    </main>
  );
}
