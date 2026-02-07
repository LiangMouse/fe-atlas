"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock, LogIn, LogOut, Shield } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type SimpleUser = {
  id: string;
  email?: string;
};

export function HiddenAuthEntry() {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? undefined });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email ?? undefined }
          : null,
      );
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
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="fixed right-4 top-4 z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="管理员入口"
        className="inline-flex h-12 w-[104px] items-center justify-center gap-2 rounded-full border border-[#e3e3e1] bg-white text-[#6f6e69] shadow-[0_1px_2px_rgba(15,15,15,0.05)] transition-colors hover:text-[#191919]"
      >
        <Shield className="h-4 w-4" />
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[260px] rounded-xl border border-[#e8e8e6] bg-white p-2 shadow-[0_10px_30px_rgba(15,15,15,0.08)]">
          {user ? (
            <>
              <p className="truncate px-2 py-1 text-[12px] text-[#8f8e8a]">{user.email ?? "已登录"}</p>
              <Link
                href="/admin"
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-[#37352f] transition-colors hover:bg-[#f5f5f4]"
                onClick={() => setOpen(false)}
              >
                <Lock className="h-4 w-4" />
                进入管理员控制台
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[#5f5e5b] transition-colors hover:bg-[#f5f5f4]"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </>
          ) : (
            <>
              <p className="px-2 py-1 text-[12px] text-[#8f8e8a]">管理员入口（对游客隐藏权限）</p>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={!isSupabaseConfigured}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border border-[#e6e6e3] bg-white px-2 py-2 text-left text-[13px] font-medium text-[#37352f] transition-colors hover:bg-[#f5f5f4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                Google 登录
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
