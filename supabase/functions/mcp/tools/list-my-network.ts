import { defineTool } from "npm:@lovable.dev/mcp-js@0.23.0";
import { supabaseForUser, notAuth, errResult, jsonResult } from "../supabase.ts";

export default defineTool({
  name: "list_my_network",
  title: "Minha rede (MLM)",
  description:
    "Lista sacoleiras indicadas diretamente pela sacoleira autenticada. Respeita RLS. Não retorna e-mail.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const sb = supabaseForUser(ctx);
    const { data: me, error: eMe } = await sb
      .from("resellers")
      .select("id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (eMe) return errResult(eMe.message);
    if (!me) return errResult("Sem cadastro de sacoleira.");
    // Apenas downline direto; sem e-mail (dado sensível)
    const { data, error } = await sb
      .from("resellers")
      .select("id, display_name, phone, tier, status, created_at")
      .eq("parent_id", me.id)
      .order("created_at", { ascending: false });
    if (error) return errResult(error.message);
    return jsonResult({ count: data?.length ?? 0, members: data });
  },
});
