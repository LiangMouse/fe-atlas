import { redirect } from "next/navigation";

import { AdminConsole } from "@/components/admin/admin-console";
import { isAdminUser } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold">管理员入口</h1>
        <p className="mt-3 text-slate-600">
          当前未配置 Supabase 环境变量。请先配置
          <code className="mx-1 rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>
          和
          <code className="mx-1 rounded bg-slate-100 px-1">
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
          </code>
          （或
          <code className="mx-1 rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          ）以及
          <code className="mx-1 rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>。
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (!isAdminUser(user)) {
    redirect("/?adminRequired=1");
  }

  return (
    <main className="mx-auto h-full w-full max-w-[1680px] overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
      <header className="mb-4 rounded-2xl border border-slate-300/80 bg-white/80 px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">管理员控制台</h1>
        <p className="mt-2 text-sm text-slate-600">当前账号：{user.email ?? user.id}</p>
      </header>


      <AdminConsole />
    </main>
  );
}
