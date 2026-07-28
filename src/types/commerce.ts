export type ProfileRole = "admin" | "sacoleira";
export type StoreStatus = "pending" | "approved" | "blocked";
export type OrderStatus =
  | "aguardando"
  | "pago"
  | "separado"
  | "enviado"
  | "entregue"
  | "cancelado"
  | "novo"
  | "confirmado"
  | "new"
  | "confirmed"
  | "paid"
  | "separated"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type CommissionLevel = 1 | 2 | 3;

export type ReturnItemCondition =
  | "perfeito_estado"
  | "embalagem_aberta"
  | "avariado"
  | "incompleto"
  | "usado"
  | "outro";

export type ReturnStockAction =
  | "retornar_ao_estoque"
  | "nao_retornar_ao_estoque"
  | "enviar_para_avaliacao";

export type ReturnResolution = "devolucao" | "troca";

/** Status elegíveis a cancel_order_with_stock_restore (restore líquido). */
export type StockCancelEligibleStatus =
  | "new"
  | "confirmed"
  | "separated"
  | "shipped"
  | "delivered";

export type OrderExpirationReason = "abandoned_checkout_expired" | string;

export type Profile = {
  id: string;
  role: ProfileRole;
  displayName: string;
  email: string;
  phone?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
  active?: boolean;
  description?: string | null;
};

/** Campos comuns — sem preços internos. */
export type ProductBase = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  suggestedPrice: number;
  stock: number;
  minOrder: number;
  image: string;
  images?: string[];
  active: boolean;
};

/** Loja pública / cliente — sem cost nem wholesale. */
export type PublicProduct = ProductBase & {
  resellerPrice: number;
  sellerStoreId?: string;
};

/** Catálogo da sacoleira — wholesale permitido; costPrice proibido. */
export type ResellerProduct = ProductBase & {
  wholesalePrice: number;
  resellerPrice?: number;
};

/** Painel admin — inclui custo interno (via RPC; pode faltar se RPC falhar). */
export type AdminProduct = ProductBase & {
  wholesalePrice: number;
  costPrice?: number;
};

/**
 * Alias histórico do admin.
 * Não usar em fluxos de sacoleira/loja pública.
 */
export type Product = AdminProduct;

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
  tier: "padrão" | "VIP" | "personalizado" | string;
  totalSpent: number;
  ordersCount: number;
  walletAvailable: number;
  walletPending: number;
  directReferrals: number;
  networkSize: number;
  templateKey?: string;
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
  status: OrderStatus | string;
};

export type StoreOrder = {
  id: string;
  storeId: string;
  customer: string;
  phone: string;
  date: string;
  items: number;
  total: number;
  status: OrderStatus | string;
};

export type Commission = {
  id: string;
  orderId: string;
  resellerId: string;
  sourceResellerId: string;
  level: CommissionLevel;
  rate: number;
  amount: number;
  status: "pending" | "available" | "paid" | string;
  date: string;
};

export type WalletTransaction = {
  id: string;
  resellerId: string;
  type: "commission" | "commission_reversal" | "withdrawal" | "adjustment" | string;
  amount: number;
  status: "pending" | "available" | "paid" | "cancelled" | string;
  description: string;
  reason?: string | null;
  date: string;
};
