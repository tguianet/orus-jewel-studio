import ringImg from "@/assets/product-ring.jpg";
import earringsImg from "@/assets/product-earrings.jpg";
import necklaceImg from "@/assets/product-necklace.jpg";
import braceletImg from "@/assets/product-bracelet.jpg";

export const appName = "Aura Store Suite";
export const brandTagline = "SaaS premium para revenda de joias";

export type ProfileRole = "admin" | "sacoleira";
export type StoreStatus = "pending" | "approved" | "blocked";
export type OrderStatus = "aguardando" | "pago" | "separado" | "enviado" | "entregue" | "cancelado" | "novo" | "confirmado";
export type CommissionLevel = 1 | 2 | 3;

export type Profile = {
  id: string;
  role: ProfileRole;
  displayName: string;
  email: string;
  phone?: string;
};

export type Category = { id: string; name: string; slug: string; count: number; active?: boolean };
export type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  costPrice: number;
  wholesalePrice: number;
  suggestedPrice: number;
  stock: number;
  minOrder: number;
  image: string;
  active: boolean;
};
export type Sacoleira = {
  id: string;
  profileId: string;
  parentId: string | null;
  name: string;
  storeName: string;
  storeSlug: string;
  email: string;
  phone: string;
  status: StoreStatus;
  tier: "padrão" | "VIP" | "personalizado";
  totalSpent: number;
  ordersCount: number;
  walletAvailable: number;
  walletPending: number;
  directReferrals: number;
  networkSize: number;
};
export type StoreProduct = {
  id: string;
  storeId: string;
  productId: string;
  resellerPrice: number;
  active: boolean;
};
export type WholesaleOrder = {
  id: string;
  sacoleiraId: string;
  sacoleiraName: string;
  date: string;
  items: number;
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
};
export type StoreOrder = {
  id: string;
  storeId: string;
  customer: string;
  phone: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus;
};
export type Commission = {
  id: string;
  orderId: string;
  resellerId: string;
  sourceResellerId: string;
  level: CommissionLevel;
  rate: number;
  amount: number;
  status: "pending" | "available" | "paid";
  date: string;
};
export type WalletTransaction = {
  id: string;
  resellerId: string;
  type: "commission" | "withdrawal" | "adjustment";
  amount: number;
  status: "pending" | "available" | "paid";
  description: string;
  date: string;
};

export const profiles: Profile[] = [
  { id: "u-admin", role: "admin", displayName: "Aura Admin", email: "admin@aurastore.com", phone: "(11) 99000-0000" },
  { id: "u-marina", role: "sacoleira", displayName: "Marina Costa", email: "marina@email.com", phone: "(11) 98765-4321" },
  { id: "u-bia", role: "sacoleira", displayName: "Beatriz Lima", email: "bia@email.com", phone: "(21) 99876-5432" },
  { id: "u-cami", role: "sacoleira", displayName: "Camila Souza", email: "cami@email.com", phone: "(31) 97654-3210" },
  { id: "u-lari", role: "sacoleira", displayName: "Larissa Mendes", email: "lari@email.com", phone: "(41) 96543-2109" },
];

export const categories: Category[] = [
  { id: "cat-aneis", name: "Anéis", slug: "aneis", count: 24, active: true },
  { id: "cat-brincos", name: "Brincos", slug: "brincos", count: 31, active: true },
  { id: "cat-colares", name: "Colares", slug: "colares", count: 18, active: true },
  { id: "cat-pulseiras", name: "Pulseiras", slug: "pulseiras", count: 15, active: true },
  { id: "cat-pingentes", name: "Pingentes", slug: "pingentes", count: 12, active: true },
  { id: "cat-conjuntos", name: "Conjuntos", slug: "conjuntos", count: 9, active: true },
  { id: "cat-tornozeleiras", name: "Tornozeleiras", slug: "tornozeleiras", count: 7, active: true },
];

export const products: Product[] = [
  { id: "p1", code: "AUR-A001", name: "Anel Solitário Aurora", category: "Anéis", description: "Anel folheado a ouro 18k com zircônia central. Acabamento premium e elegante.", costPrice: 28, wholesalePrice: 49, suggestedPrice: 119, stock: 42, minOrder: 1, image: ringImg, active: true },
  { id: "p2", code: "AUR-B012", name: "Brinco Gota Veneza", category: "Brincos", description: "Brinco em formato de gota, design vazado contemporâneo, folheado a ouro 18k.", costPrice: 32, wholesalePrice: 58, suggestedPrice: 139, stock: 28, minOrder: 1, image: earringsImg, active: true },
  { id: "p3", code: "AUR-C034", name: "Colar Esfera Lumière", category: "Colares", description: "Colar delicado com pingente esférico minimalista. Perfeito para uso diário.", costPrice: 38, wholesalePrice: 69, suggestedPrice: 159, stock: 15, minOrder: 1, image: necklaceImg, active: true },
  { id: "p4", code: "AUR-P018", name: "Pulseira Trançada Royale", category: "Pulseiras", description: "Pulseira rígida com trama dourada artesanal. Peça statement.", costPrice: 45, wholesalePrice: 79, suggestedPrice: 189, stock: 8, minOrder: 1, image: braceletImg, active: true },
  { id: "p5", code: "AUR-A007", name: "Anel Duo Eclipse", category: "Anéis", description: "Conjunto de dois anéis sobreponíveis em ouro polido.", costPrice: 30, wholesalePrice: 54, suggestedPrice: 129, stock: 22, minOrder: 1, image: ringImg, active: true },
  { id: "p6", code: "AUR-B021", name: "Brinco Argola Mini", category: "Brincos", description: "Argola pequena cravejada, leve e versátil.", costPrice: 26, wholesalePrice: 45, suggestedPrice: 109, stock: 4, minOrder: 1, image: earringsImg, active: true },
];

export const sacoleiras: Sacoleira[] = [
  { id: "s1", profileId: "u-marina", parentId: null, name: "Marina Costa", storeName: "Marina Aura", storeSlug: "marina-aura", email: "marina@email.com", phone: "(11) 98765-4321", status: "approved", tier: "VIP", totalSpent: 4820, ordersCount: 12, walletAvailable: 842.5, walletPending: 156.8, directReferrals: 2, networkSize: 3 },
  { id: "s2", profileId: "u-bia", parentId: "s1", name: "Beatriz Lima", storeName: "Bia Brilhos", storeSlug: "bia-brilhos", email: "bia@email.com", phone: "(21) 99876-5432", status: "approved", tier: "padrão", totalSpent: 1290, ordersCount: 4, walletAvailable: 214.0, walletPending: 49.5, directReferrals: 1, networkSize: 1 },
  { id: "s3", profileId: "u-cami", parentId: "s2", name: "Camila Souza", storeName: "Cami Acessórios", storeSlug: "cami-acessorios", email: "cami@email.com", phone: "(31) 97654-3210", status: "pending", tier: "padrão", totalSpent: 0, ordersCount: 0, walletAvailable: 0, walletPending: 0, directReferrals: 0, networkSize: 0 },
  { id: "s4", profileId: "u-lari", parentId: "s1", name: "Larissa Mendes", storeName: "Lari Luxo", storeSlug: "lari-luxo", email: "lari@email.com", phone: "(41) 96543-2109", status: "approved", tier: "personalizado", totalSpent: 8950, ordersCount: 23, walletAvailable: 1260.3, walletPending: 312.2, directReferrals: 0, networkSize: 0 },
];

export const storeProducts: StoreProduct[] = [
  { id: "sp1", storeId: "s1", productId: "p1", resellerPrice: 129, active: true },
  { id: "sp2", storeId: "s1", productId: "p2", resellerPrice: 149, active: true },
  { id: "sp3", storeId: "s1", productId: "p3", resellerPrice: 169, active: true },
  { id: "sp4", storeId: "s1", productId: "p4", resellerPrice: 199, active: true },
  { id: "sp5", storeId: "s2", productId: "p1", resellerPrice: 119, active: true },
  { id: "sp6", storeId: "s2", productId: "p5", resellerPrice: 139, active: true },
  { id: "sp7", storeId: "s4", productId: "p2", resellerPrice: 159, active: true },
  { id: "sp8", storeId: "s4", productId: "p6", resellerPrice: 119, active: true },
];

export const wholesaleOrders: WholesaleOrder[] = [
  { id: "PED-1042", sacoleiraId: "s1", sacoleiraName: "Marina Aura", date: "2026-04-18", items: 8, subtotal: 520, discount: 52, total: 468, status: "enviado" },
  { id: "PED-1041", sacoleiraId: "s4", sacoleiraName: "Lari Luxo", date: "2026-04-17", items: 14, subtotal: 980, discount: 147, total: 833, status: "pago" },
  { id: "PED-1040", sacoleiraId: "s2", sacoleiraName: "Bia Brilhos", date: "2026-04-16", items: 5, subtotal: 295, discount: 0, total: 295, status: "aguardando" },
  { id: "PED-1039", sacoleiraId: "s1", sacoleiraName: "Marina Aura", date: "2026-04-15", items: 11, subtotal: 745, discount: 74, total: 671, status: "entregue" },
];

export const storeOrders: StoreOrder[] = [
  { id: "L-201", storeId: "s1", customer: "Ana Paula", phone: "(11) 91111-1111", date: "2026-04-19", items: 2, total: 278, status: "novo" },
  { id: "L-200", storeId: "s1", customer: "Júlia Reis", phone: "(11) 92222-2222", date: "2026-04-18", items: 1, total: 169, status: "confirmado" },
  { id: "L-199", storeId: "s4", customer: "Patrícia M.", phone: "(11) 93333-3333", date: "2026-04-17", items: 3, total: 427, status: "entregue" },
];

export const commissions: Commission[] = [
  { id: "c1", orderId: "L-201", resellerId: "s1", sourceResellerId: "s1", level: 1, rate: 0.1, amount: 27.8, status: "pending", date: "2026-04-19" },
  { id: "c2", orderId: "L-199", resellerId: "s1", sourceResellerId: "s4", level: 1, rate: 0.1, amount: 42.7, status: "available", date: "2026-04-17" },
  { id: "c3", orderId: "L-199", resellerId: "s2", sourceResellerId: "s4", level: 2, rate: 0.05, amount: 21.35, status: "available", date: "2026-04-17" },
  { id: "c4", orderId: "L-200", resellerId: "s1", sourceResellerId: "s1", level: 1, rate: 0.1, amount: 16.9, status: "available", date: "2026-04-18" },
];

export const walletTransactions: WalletTransaction[] = [
  { id: "w1", resellerId: "s1", type: "commission", amount: 42.7, status: "available", description: "Comissão nível 1 — pedido L-199", date: "2026-04-17" },
  { id: "w2", resellerId: "s1", type: "commission", amount: 27.8, status: "pending", description: "Comissão por venda — pedido L-201", date: "2026-04-19" },
  { id: "w3", resellerId: "s1", type: "withdrawal", amount: -150, status: "paid", description: "Saque processado", date: "2026-04-10" },
];

export const commissionRules = [
  { level: 1 as const, rate: 0.1, label: "Nível 1" },
  { level: 2 as const, rate: 0.05, label: "Nível 2" },
  { level: 3 as const, rate: 0.02, label: "Nível 3" },
];

export const statusLabels: Record<string, string> = {
  aguardando: "Aguardando pagamento",
  pago: "Pago",
  separado: "Separado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  novo: "Novo",
  confirmado: "Confirmado",
};

export const statusColors: Record<string, string> = {
  aguardando: "bg-warning/15 text-warning border-warning/30",
  pago: "bg-primary/15 text-primary border-primary/30",
  separado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  enviado: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  entregue: "bg-success/15 text-success border-success/30",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
  novo: "bg-warning/15 text-warning border-warning/30",
  confirmado: "bg-success/15 text-success border-success/30",
  available: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  paid: "bg-primary/15 text-primary border-primary/30",
};

export const fallbackStore: Sacoleira = sacoleiras[0];
export const fallbackProduct: Product = products[0];

export const getStoreBySlug = (slug?: string): Sacoleira => sacoleiras.find(s => s.storeSlug === slug && s.status === "approved") ?? fallbackStore;
export const getProductById = (id?: string): Product => products.find(p => p.id === id && p.active) ?? fallbackProduct;
export const getStoreProducts = (storeId?: string) => storeProducts
  .filter(sp => sp.storeId === (storeId || fallbackStore.id) && sp.active)
  .map(sp => ({ ...products.find(p => p.id === sp.productId), resellerPrice: sp.resellerPrice }))
  .filter((p): p is Product & { resellerPrice: number } => Boolean(p?.id));
export const getOrdersByStore = (storeId?: string) => storeOrders.filter(o => o.storeId === (storeId || fallbackStore.id));
export const getCommissionsByReseller = (resellerId?: string) => commissions.filter(c => c.resellerId === (resellerId || fallbackStore.id));
export const getWalletTransactions = (resellerId?: string) => walletTransactions.filter(w => w.resellerId === (resellerId || fallbackStore.id));
export const getNetwork = (resellerId?: string) => sacoleiras.filter(s => s.parentId === (resellerId || fallbackStore.id));
export const formatBRL = (n: number) => Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";
