import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isAdminUser } from "@/lib/auth/admin";
import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ user: null, isAdmin: false });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // no-op
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          email: user.email ?? undefined,
        }
      : null,
    isAdmin: isAdminUser(user),
  });
}
