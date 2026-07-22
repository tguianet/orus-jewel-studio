import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyStore from "./tools/get-my-store";
import listMyOrders from "./tools/list-my-orders";
import listMyProducts from "./tools/list-my-products";
import listMyNetwork from "./tools/list-my-network";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aura-store-mcp",
  title: "Amada Amante — MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas para sacoleiras da Amada Amante: consultar sua loja, produtos, pedidos e rede MLM. Todas as ferramentas operam apenas sobre os dados da sacoleira autenticada (respeita RLS).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyStore, listMyOrders, listMyProducts, listMyNetwork],
});
