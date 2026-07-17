import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuth, errResult, jsonResult } from "../supabase";

export default defineTool({
  name: "get_my_store",
  title: "Minha loja",
  description: "Retorna a loja da sacoleira autenticada (nome, slug, status, tier, comissão).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("seller_stores")
      .select("id, store_name, store_slug, status, tier, commission_rate, contact_phone, created_at")
      .eq("owner_user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return errResult(error.message);
    if (!data) return errResult("Nenhuma loja associada a este usuário.");
    return jsonResult(data);
  },
});
