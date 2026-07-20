import { defineTool } from "npm:@lovable.dev/mcp-js@0.23.0";
import { z } from "npm:zod@3";
import { supabaseForUser, notAuth, errResult, jsonResult } from "../supabase.ts";

export default defineTool({
  name: "list_my_orders",
  title: "Meus pedidos",
  description:
    "Lista pedidos da loja da sacoleira autenticada (mais recentes primeiro). Respeita RLS.",
  inputSchema: {
    status: z
      .string()
      .optional()
      .describe("Filtrar por status (ex.: new, paid, shipped, delivered)."),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Máximo de pedidos (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const sb = supabaseForUser(ctx);
    const { data: store, error: sErr } = await sb
      .from("seller_stores")
      .select("id")
      .eq("owner_user_id", ctx.getUserId())
      .maybeSingle();
    if (sErr) return errResult(sErr.message);
    if (!store) return errResult("Sem loja associada.");

    let q = sb
      .from("orders")
      .select("id, created_at, status, customer_name, customer_phone, subtotal, discount, total, notes")
      .eq("seller_store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 20, 100));
    if (status) q = q.eq("status", status as never);
    const { data, error } = await q;
    if (error) return errResult(error.message);
    return jsonResult(data);
  },
});
