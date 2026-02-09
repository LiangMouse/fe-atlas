"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Home, Lock, LogIn, LogOut, User } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type SimpleUser = {
  id: string;
  email?: string;
};

export function HiddenAuthEntry() {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    const syncAuthState = async () => {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        setIsAdmin(false);
        return;
      }

      const data = (await response.json()) as { user: SimpleUser | null; isAdmin: boolean };
      setUser(data.user);
      setIsAdmin(data.isAdmin);
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await syncAuthState();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const next = `${window.location.pathname}${window.location.search}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    const confirmed = window.confirm("确认退出登录吗？");
    if (!confirmed) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    setIsAdmin(false);
  };

  return (
    <div ref={containerRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="用户入口"
        className="inline-flex h-10 min-w-[86px] items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <User className="h-4 w-4 shrink-0" />
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[260px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgba(15,15,15,0.08)] dark:border-slate-700 dark:bg-slate-900">
          {isAdmin ? (
            <>
              <p className="truncate px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400">{user?.email ?? "管理员"}</p>
              <Link
                href="/admin"
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                <Lock className="h-4 w-4" />
                进入管理员控制台
              </Link>
              <Link
                href="/"
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                <Home className="h-4 w-4" />
                个人主页
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </>
          ) : (
            <>
              <p className="px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400">
                {user ? "当前账号无管理员权限" : "游客访问，请先登录"}
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              ) : null}
              {isSupabaseConfigured ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (user) {
                      await signOut();
                    }
                    await signInWithGoogle();
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  去登录
                </button>
              ) : (
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  当前站点未配置登录服务，请联系管理员配置 Supabase 环境变量。
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
