// Owned Edge Function — not auto-generated.
// Uses relative imports within this folder + npm: packages (Deno/Supabase compatible).
import { auth, defineMcp } from "npm:@lovable.dev/mcp-js@0.23.0";
import { createSupabaseHandler } from "npm:@lovable.dev/mcp-js@0.23.0/stacks/supabase";
import getMyStore from "./tools/get-my-store.ts";
import listMyOrders from "./tools/list-my-orders.ts";
import listMyProducts from "./tools/list-my-products.ts";
import listMyNetwork from "./tools/list-my-network.ts";

function resolveProjectRef(): string {
  const fromUrl = Deno.env.get("SUPABASE_URL")?.match(
    /^https:\/\/([a-z0-9-]+)\.supabase\.co/i,
  )?.[1];
  return (
    fromUrl ||
    Deno.env.get("SUPABASE_PROJECT_ID") ||
    Deno.env.get("VITE_SUPABASE_PROJECT_ID") ||
    "ycxfyyhxgsbjoiijxgyu"
  );
}

const projectRef = resolveProjectRef();

const mcp = defineMcp({
  name: "orus-store-mcp",
  title: "Amada Amante — MCP",
  version: "0.2.0",
  instructions:
    "Ferramentas para sacoleiras Amada Amante: consultar sua loja, produtos, pedidos e rede. Todas operam só sobre dados da sacoleira autenticada (JWT + RLS). Sem service role.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyStore, listMyOrders, listMyProducts, listMyNetwork],
});

Deno.serve(createSupabaseHandler(mcp, { functionName: "mcp" }));
