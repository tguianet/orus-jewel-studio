import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuth, errResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_my_products",
  title: "Meus produtos",
  description: "Lista produtos ativos na loja da sacoleira autenticada.",
  inputSchema: {
    limit: z.number().int().positive().optional().describe("Máximo de itens (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const sb = supabaseForUser(ctx);
    const { data: store } = await sb
      .from("seller_stores").select("id").eq("owner_user_id", ctx.getUserId()).maybeSingle();
    if (!store) return errResult("Sem loja associada.");
    const { data, error } = await sb
      .from("store_products")
      .select("id, resale_price, active, product:products(id, code, name, category_name, image_url, status)")
      .eq("seller_store_id", store.id)
      .eq("active", true)
      .limit(Math.min(limit ?? 50, 200));
    if (error) return errResult(error.message);
    return jsonResult(data);
  },
});
