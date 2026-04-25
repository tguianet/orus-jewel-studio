import ringImg from "@/assets/product-ring.jpg";
import earringsImg from "@/assets/product-earrings.jpg";
import necklaceImg from "@/assets/product-necklace.jpg";
import braceletImg from "@/assets/product-bracelet.jpg";

export type Category = { id: string; name: string; slug: string; count: number };
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
  name: string;
  storeName: string;
  storeSlug: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "blocked";
  tier: "padrão" | "VIP" | "personalizado";
  totalSpent: number;
  ordersCount: number;
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
  status: "aguardando" | "pago" | "separado" | "enviado" | "entregue" | "cancelado";
};

export const categories: Category[] = [
  { id: "1", name: "Anéis", slug: "aneis", count: 24 },
  { id: "2", name: "Brincos", slug: "brincos", count: 31 },
  { id: "3", name: "Colares", slug: "colares", count: 18 },
  { id: "4", name: "Pulseiras", slug: "pulseiras", count: 15 },
  { id: "5", name: "Pingentes", slug: "pingentes", count: 12 },
  { id: "6", name: "Conjuntos", slug: "conjuntos", count: 9 },
  { id: "7", name: "Tornozeleiras", slug: "tornozeleiras", count: 7 },
];

export const products: Product[] = [
  { id: "p1", code: "ORS-A001", name: "Anel Solitário Aurora", category: "Anéis", description: "Anel folheado a ouro 18k com zircônia central. Acabamento premium e elegante.", costPrice: 28, wholesalePrice: 49, suggestedPrice: 119, stock: 42, minOrder: 3, image: ringImg, active: true },
  { id: "p2", code: "ORS-B012", name: "Brinco Gota Veneza", category: "Brincos", description: "Brinco em formato de gota, design vazado contemporâneo, folheado a ouro 18k.", costPrice: 32, wholesalePrice: 58, suggestedPrice: 139, stock: 28, minOrder: 2, image: earringsImg, active: true },
  { id: "p3", code: "ORS-C034", name: "Colar Esfera Lumière", category: "Colares", description: "Colar delicado com pingente esférico minimalista. Perfeito para uso diário.", costPrice: 38, wholesalePrice: 69, suggestedPrice: 159, stock: 15, minOrder: 2, image: necklaceImg, active: true },
  { id: "p4", code: "ORS-P018", name: "Pulseira Trançada Royale", category: "Pulseiras", description: "Pulseira rígida com trama dourada artesanal. Peça statement.", costPrice: 45, wholesalePrice: 79, suggestedPrice: 189, stock: 8, minOrder: 2, image: braceletImg, active: true },
  { id: "p5", code: "ORS-A007", name: "Anel Duo Eclipse", category: "Anéis", description: "Conjunto de dois anéis sobreponíveis em ouro polido.", costPrice: 30, wholesalePrice: 54, suggestedPrice: 129, stock: 22, minOrder: 3, image: ringImg, active: true },
  { id: "p6", code: "ORS-B021", name: "Brinco Argola Mini", category: "Brincos", description: "Argola pequena cravejada, leve e versátil.", costPrice: 26, wholesalePrice: 45, suggestedPrice: 109, stock: 4, minOrder: 2, image: earringsImg, active: true },
];

export const sacoleiras: Sacoleira[] = [
  { id: "s1", name: "Marina Costa", storeName: "Marina Joias", storeSlug: "marina-joias", email: "marina@email.com", phone: "(11) 98765-4321", status: "approved", tier: "VIP", totalSpent: 4820, ordersCount: 12 },
  { id: "s2", name: "Beatriz Lima", storeName: "Bia Brilhos", storeSlug: "bia-brilhos", email: "bia@email.com", phone: "(21) 99876-5432", status: "approved", tier: "padrão", totalSpent: 1290, ordersCount: 4 },
  { id: "s3", name: "Camila Souza", storeName: "Cami Acessórios", storeSlug: "cami-acessorios", email: "cami@email.com", phone: "(31) 97654-3210", status: "pending", tier: "padrão", totalSpent: 0, ordersCount: 0 },
  { id: "s4", name: "Larissa Mendes", storeName: "Lari Luxo", storeSlug: "lari-luxo", email: "lari@email.com", phone: "(41) 96543-2109", status: "approved", tier: "personalizado", totalSpent: 8950, ordersCount: 23 },
];

export const wholesaleOrders: WholesaleOrder[] = [
  { id: "PED-1042", sacoleiraId: "s1", sacoleiraName: "Marina Joias", date: "2025-04-18", items: 8, subtotal: 520, discount: 52, total: 468, status: "enviado" },
  { id: "PED-1041", sacoleiraId: "s4", sacoleiraName: "Lari Luxo", date: "2025-04-17", items: 14, subtotal: 980, discount: 147, total: 833, status: "pago" },
  { id: "PED-1040", sacoleiraId: "s2", sacoleiraName: "Bia Brilhos", date: "2025-04-16", items: 5, subtotal: 295, discount: 0, total: 295, status: "aguardando" },
  { id: "PED-1039", sacoleiraId: "s1", sacoleiraName: "Marina Joias", date: "2025-04-15", items: 11, subtotal: 745, discount: 74, total: 671, status: "entregue" },
  { id: "PED-1038", sacoleiraId: "s4", sacoleiraName: "Lari Luxo", date: "2025-04-14", items: 6, subtotal: 380, discount: 57, total: 323, status: "separado" },
];

export const storeOrders = [
  { id: "L-201", customer: "Ana Paula", phone: "(11) 91111-1111", date: "2025-04-19", items: 2, total: 248, status: "novo" as const },
  { id: "L-200", customer: "Júlia Reis", phone: "(11) 92222-2222", date: "2025-04-18", items: 1, total: 159, status: "confirmado" as const },
  { id: "L-199", customer: "Patrícia M.", phone: "(11) 93333-3333", date: "2025-04-17", items: 3, total: 427, status: "entregue" as const },
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
};

export const fallbackStore: Sacoleira = sacoleiras[0] ?? {
  id: "s-demo",
  name: "Marina Costa",
  storeName: "Marina Joias",
  storeSlug: "marina-joias",
  email: "marina@email.com",
  phone: "(11) 98765-4321",
  status: "approved",
  tier: "padrão",
  totalSpent: 0,
  ordersCount: 0,
};

export const fallbackProduct: Product = products[0] ?? {
  id: "p-demo",
  code: "ORS-DEMO",
  name: "Joia Orus",
  category: "Joias",
  description: "Peça demonstrativa do catálogo Orus.",
  costPrice: 30,
  wholesalePrice: 59,
  suggestedPrice: 139,
  stock: 10,
  minOrder: 1,
  image: ringImg,
  active: true,
};

export const getStoreBySlug = (slug?: string) => sacoleiras.find(s => s.storeSlug === slug) ?? fallbackStore;

export const getProductById = (id?: string) => products.find(p => p.id === id);

export const formatBRL = (n: number) => Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";
