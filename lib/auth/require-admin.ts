import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/auth/admin";
import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/config";

export async function requireAdminFromRequest(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return { ok: false as const, user: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // noop for API auth check
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    return { ok: false as const, user: null };
  }

  return { ok: true as const, user };
}
