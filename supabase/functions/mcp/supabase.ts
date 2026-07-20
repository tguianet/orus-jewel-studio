import { createClient } from "npm:@supabase/supabase-js@2";

type ToolContext = {
  isAuthenticated: () => boolean;
  getToken: () => string;
  getUserId: () => string;
};

export function supabaseForUser(ctx: ToolContext) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuth() {
  return {
    content: [{ type: "text" as const, text: "Não autenticado." }],
    isError: true,
  };
}

export function errResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true,
  };
}

export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: { data } as Record<string, unknown>,
  };
}
