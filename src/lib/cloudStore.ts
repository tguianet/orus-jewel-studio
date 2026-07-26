import ringImg from "@/assets/product-ring.jpg";
import earringsImg from "@/assets/product-earrings.jpg";
import necklaceImg from "@/assets/product-necklace.jpg";
import braceletImg from "@/assets/product-bracelet.jpg";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";
import type {
  AdminProduct,
  PublicProduct,
  ResellerProduct,
  Sacoleira,
} from "@/types/commerce";
import { loadAdminProductCosts, mergeAdminCost } from "@/lib/productCosts";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type SellerStoreStatus = Database["public"]["Enums"]["seller_store_status"];

type PublicStoreRow = Pick<
  Tables<"seller_stores">,
  "id" | "store_name" | "store_slug" | "status" | "tier" | "theme" | "created_at"
>;

type StoreProductQueryRow = {
  id: string;
  resale_price: number;
  seller_store_id: string;
  active: boolean;
  images: string[] | null;
  products: {
    id: string;
    code: string;
    name: string;
    description: string;
    suggested_price: number;
    stock: number;
    min_order: number;
    image_url: string | null;
    images: string[] | null;
    status: string;
    category_name: string | null;
    categories: { name: string } | null;
  } | null;
};

/** Linha de products sem cost_price (sacoleira / listagem base admin). */
type ProductRowNoCost = Pick<
  Tables<"products">,
  | "id"
  | "code"
  | "name"
  | "description"
  | "wholesale_price"
  | "suggested_price"
  | "stock"
  | "min_order"
  | "image_url"
  | "images"
  | "category_name"
  | "status"
>;

export const RESELLER_PRODUCT_SELECT =
  "id,code,name,description,wholesale_price,suggested_price,stock,min_order,image_url,images,category_name,status";

export const ADMIN_PRODUCT_SELECT_NO_COST =
  "id,code,name,description,wholesale_price,suggested_price,stock,min_order,image_url,images,category_name,status";

export const PUBLIC_PRODUCT_NESTED_SELECT =
  "id, code, name, description, suggested_price, stock, min_order, image_url, images, status, category_name, categories(name)";

type StoreProductLink = Pick<Tables<"store_products">, "id" | "product_id" | "resale_price" | "active" | "images">;

type OrderWithItems = Pick<
  Tables<"orders">,
  "id" | "customer_name" | "customer_phone" | "total" | "status" | "created_at"
> & {
  order_items: { id: string }[] | null;
};

type OrderDetailRow = Pick<
  Tables<"orders">,
  | "id"
  | "customer_name"
  | "customer_phone"
  | "customer_address"
  | "notes"
  | "subtotal"
  | "discount"
  | "total"
  | "status"
  | "created_at"
> & {
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[] | null;
};

type ResellerRow = Pick<Tables<"resellers">, "id" | "display_name" | "email" | "phone" | "status">;

type ThemeWithWhatsapp = { whatsapp?: string | null };

const imageByCategory = (category?: string | null) => {
  const name = (category || "").toLowerCase();
  if (name.includes("brinco")) return earringsImg;
  if (name.includes("colar")) return necklaceImg;
  if (name.includes("pulseira")) return braceletImg;
  return ringImg;
};

export type CloudStoreProduct = PublicProduct & { sellerStoreId: string };

export const mapStore = (
  row: PublicStoreRow & {
    contact_phone?: string | null;
    reseller_id?: string | null;
    owner_user_id?: string | null;
    resellers?: { parent_id?: string | null; display_name?: string | null; email?: string | null; phone?: string | null } | null;
  },
): Sacoleira => ({
  id: row.id,
  profileId: row.reseller_id || row.owner_user_id || "",
  parentId: row.resellers?.parent_id || null,
  name: row.resellers?.display_name || row.store_name,
  storeName: row.store_name,
  storeSlug: row.store_slug,
  email: row.resellers?.email || "",
  phone: row.contact_phone || row.resellers?.phone || "",
  status: row.status as SellerStoreStatus,
  tier: row.tier,
  totalSpent: 0,
  ordersCount: 0,
  walletAvailable: 0,
  walletPending: 0,
  directReferrals: 0,
  networkSize: 0,
});

export const loadPublicStore = async (slug?: string) => {
  if (!slug) return null;
  // Public-safe columns only. Anon has SELECT revoked on contact_phone,
  // commission_rate, owner_user_id, reseller_id. Phone for WhatsApp comes
  // from theme.whatsapp when the seller sets it.
  const { data, error } = await supabase
    .from("seller_stores")
    .select("id, store_name, store_slug, status, tier, theme, created_at")
    .eq("store_slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) return null;
  const theme = (data.theme ?? {}) as ThemeWithWhatsapp;
  return mapStore({ ...data, contact_phone: theme.whatsapp || null });
};


export const loadStoreProducts = async (sellerStoreId: string): Promise<CloudStoreProduct[]> => {
  // Público: apenas colunas de PUBLIC_PRODUCT_NESTED_SELECT + resale.
  const { data, error } = await supabase
    .from("store_products")
    .select(
      `id, resale_price, seller_store_id, active, images, products(${PUBLIC_PRODUCT_NESTED_SELECT})`,
    )
    .eq("seller_store_id", sellerStoreId)
    .eq("active", true);

  if (error) throw error;
  if (!data) return [];

  return (data as unknown as StoreProductQueryRow[])
    .map((item) => {
      const product = item.products;
      if (!product || product.status !== "active") return null;
      const category = product.categories?.name || product.category_name || "Joias";
      const productImages: string[] = Array.isArray(product.images) ? product.images : [];
      const storeImages: string[] = Array.isArray(item.images) ? item.images : [];
      const gallery = [...productImages, ...storeImages].filter(Boolean);
      const primary = gallery[0] || product.image_url || imageByCategory(category);
      const finalGallery = gallery.length ? gallery : (product.image_url ? [product.image_url] : [primary]);
      return {
        id: product.id,
        code: product.code,
        name: product.name,
        category,
        description: product.description,
        suggestedPrice: Number(product.suggested_price || 0),
        stock: Number(product.stock || 0),
        minOrder: Number(product.min_order || 1),
        image: primary,
        images: finalGallery,
        active: product.status === "active",
        resellerPrice: Number(item.resale_price || product.suggested_price || 0),
        sellerStoreId: item.seller_store_id,
      } satisfies CloudStoreProduct;
    })
    .filter((item) => item !== null) as CloudStoreProduct[];
};


// ---------- Admin / catalog ----------

export type CatalogProduct = ResellerProduct & {
  selected: boolean;
  storeProductId?: string;
  resellerPrice: number;
};

const mapResellerProductRow = (p: ProductRowNoCost): ResellerProduct => {
  const gallery: string[] = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const finalGallery = gallery.length ? gallery : (p.image_url ? [p.image_url] : []);
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category_name || "Joias",
    description: p.description,
    wholesalePrice: Number(p.wholesale_price || 0),
    suggestedPrice: Number(p.suggested_price || 0),
    stock: Number(p.stock || 0),
    minOrder: Number(p.min_order || 1),
    image: finalGallery[0] || imageByCategory(p.category_name),
    images: finalGallery,
    active: p.status === "active",
  };
};

/** Admin: listagem sem cost_price + merge via admin_product_costs(). */
export const loadAdminProducts = async (): Promise<AdminProduct[]> => {
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT_NO_COST)
    .is("seller_store_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  let costs = new Map<string, { id: string; cost_price: number; wholesale_price: number }>();
  try {
    costs = await loadAdminProductCosts();
  } catch (e) {
    console.warn("[loadAdminProducts] admin_product_costs indisponível:", e);
  }

  return ((data ?? []) as ProductRowNoCost[]).map((p) => {
    const base = mapResellerProductRow(p);
    const merged = mergeAdminCost(p.id, costs, base.wholesalePrice);
    const row: AdminProduct = {
      ...base,
      wholesalePrice: merged.wholesalePrice ?? base.wholesalePrice,
    };
    if (merged.costPrice !== undefined) {
      row.costPrice = merged.costPrice;
    }
    return row;
  });
};

/** Catálogo da sacoleira: wholesale ok; cost_price nunca no SELECT. */
export const loadCatalogForStore = async (storeId: string): Promise<CatalogProduct[]> => {
  const [{ data: products, error: productsError }, { data: links, error: linksError }] = await Promise.all([
    supabase
      .from("products")
      .select(RESELLER_PRODUCT_SELECT)
      .eq("status", "active")
      .is("seller_store_id", null)
      .or("category_name.is.null,category_name.neq.Cadastro em massa")
      .order("created_at", { ascending: false }),
    supabase
      .from("store_products")
      .select("id,product_id,resale_price,active,images")
      .eq("seller_store_id", storeId),
  ]);
  if (productsError) throw productsError;
  if (linksError) throw linksError;

  const linkByProduct = new Map<string, { id: string; price: number; active: boolean; images: string[] }>(
    ((links ?? []) as StoreProductLink[]).map((l) => [
      l.product_id,
      {
        id: l.id,
        price: Number(l.resale_price || 0),
        active: l.active,
        images: Array.isArray(l.images) ? l.images : [],
      },
    ]),
  );
  return ((products ?? []) as ProductRowNoCost[]).map((p) => {
    const link = linkByProduct.get(p.id);
    const productImages: string[] = Array.isArray(p.images) ? p.images : [];
    const gallery = [...productImages, ...(link?.images ?? [])].filter(Boolean);
    const finalGallery = gallery.length ? gallery : (p.image_url ? [p.image_url] : []);
    const base = mapResellerProductRow(p);
    return {
      ...base,
      image: finalGallery[0] || imageByCategory(p.category_name),
      images: finalGallery,
      selected: !!link?.active,
      storeProductId: link?.id,
      resellerPrice: link?.price || Number(p.suggested_price || 0),
    };
  });
};


export const toggleStoreProduct = async (
  storeId: string,
  productId: string,
  payload: { active: boolean; resalePrice: number; storeProductId?: string },
) => {
  if (payload.storeProductId) {
    const { error } = await supabase
      .from("store_products")
      .update({ active: payload.active, resale_price: payload.resalePrice })
      .eq("id", payload.storeProductId);
    if (error) throw error;
    return payload.storeProductId;
  }
  const { data, error } = await supabase
    .from("store_products")
    .insert({ seller_store_id: storeId, product_id: productId, resale_price: payload.resalePrice, active: payload.active })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
};

// ---------- Orders ----------

export type SellerOrderRow = {
  id: string;
  customer: string;
  phone: string;
  date: string;
  items: number;
  total: number;
  status: string;
};

export const loadOrdersForStore = async (storeId: string): Promise<SellerOrderRow[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select("id,customer_name,customer_phone,total,status,created_at,order_items(id)")
    .eq("seller_store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as OrderWithItems[]).map((o) => ({
    id: o.id,
    customer: o.customer_name,
    phone: o.customer_phone,
    date: o.created_at,
    items: o.order_items?.length ?? 0,
    total: Number(o.total || 0),
    status: o.status,
  }));
};

export type OrderDetail = {
  id: string;
  customer: string;
  phone: string;
  address: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  date: string;
  items: { id: string; productName: string; quantity: number; unitPrice: number; total: number }[];
};

export const loadOrderDetail = async (orderId: string): Promise<OrderDetail | null> => {
  const { data, error } = await supabase
    .from("orders")
    .select("id,customer_name,customer_phone,customer_address,notes,subtotal,discount,total,status,created_at,order_items(id,product_name,quantity,unit_price,total)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as OrderDetailRow;
  return {
    id: row.id,
    customer: row.customer_name,
    phone: row.customer_phone,
    address: row.customer_address,
    notes: row.notes,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    status: row.status,
    date: row.created_at,
    items: (row.order_items || []).map((i) => ({
      id: i.id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price || 0),
      total: Number(i.total || 0),
    })),
  };
};

export type AdminOrderRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  created_at: string;
  seller_store_id: string;
  seller_stores: { store_name: string } | null;
  expires_at: string | null;
  expired_at: string | null;
  expiration_reason: string | null;
};

/** @deprecated Prefira loadOrdersPage — mantido para compatibilidade pontual. */
export const loadAllOrders = async (): Promise<AdminOrderRow[]> => {
  const page = await loadOrdersPage({ page: 1, pageSize: 100 });
  return page.rows;
};

export type OrdersPageFilters = {
  page: number;
  pageSize?: number;
  from?: string;
  to?: string;
  onlyExpired?: boolean;
};

export type OrdersPageResult = {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
};

const ORDERS_LIST_SELECT =
  "id,customer_name,customer_phone,total,status,created_at,seller_store_id,expires_at,expired_at,expiration_reason,seller_stores(store_name)";

/** Listagem paginada enxuta (sem itens/endereço/notas). */
export const loadOrdersPage = async (filters: OrdersPageFilters): Promise<OrdersPageResult> => {
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const page = Math.max(1, Math.floor(filters.page || 1));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(ORDERS_LIST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00`);
  }
  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999`);
  }
  if (filters.onlyExpired) {
    query = query.not("expired_at", "is", null);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []) as AdminOrderRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus | string) => {
  // cancelled via UPDATE direto está bloqueado no banco e depreciado no frontend.
  // Use cancel_order_with_stock_restore (não pago) ou cancel_paid_order (pago).
  if (status === "cancelled") {
    throw new Error(
      "Cancelamento direto depreciado. Use “Cancelar pedido” ou “Cancelar pago”.",
    );
  }
  const { error } = await supabase.from("orders").update({ status: status as OrderStatus }).eq("id", orderId);
  if (error) throw error;
};

// ---------- Wallet ----------

export type WalletSummary = {
  pending: number;
  available: number;
  paid: number;
  total: number;
  blocked?: number;
};
export type WalletTx = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  reason?: string | null;
  created_at: string;
  commission_id: string | null;
};

export const loadWalletForReseller = async (resellerId: string) => {
  const [{ data: summary, error: summaryError }, { data: txs, error: txsError }] = await Promise.all([
    supabase
      .from("reseller_wallet_summary")
      .select("reseller_id,pending,available,paid,total_balance,blocked")
      .eq("reseller_id", resellerId)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id,type,amount,status,description,created_at,commission_id")
      .eq("reseller_id", resellerId)
      .order("created_at", { ascending: false }),
  ]);
  if (summaryError) throw summaryError;
  if (txsError) throw txsError;
  return {
    summary: {
      pending: Number(summary?.pending || 0),
      available: Number(summary?.available || 0),
      paid: Number(summary?.paid || 0),
      total: Number(summary?.total_balance || 0),
      blocked: Number((summary as { blocked?: number } | null)?.blocked || 0),
    } as WalletSummary,
    transactions: (txs ?? []) as WalletTx[],
  };
};

// ---------- Network (MLM) ----------

export type NetworkMember = { id: string; name: string; email: string; phone: string | null; status: string; level: number };

export const loadNetwork = async (rootResellerId: string): Promise<NetworkMember[]> => {
  // Three levels via three queries (small N)
  const result: NetworkMember[] = [];
  const lvl1Res = await supabase.from("resellers").select("id,display_name,email,phone,status").eq("parent_id", rootResellerId);
  if (lvl1Res.error) throw lvl1Res.error;
  const lvl1 = (lvl1Res.data ?? []) as ResellerRow[];
  lvl1.forEach((r) => result.push({ id: r.id, name: r.display_name, email: r.email, phone: r.phone, status: r.status, level: 1 }));
  if (lvl1.length) {
    const ids1 = lvl1.map((r) => r.id);
    const lvl2Res = await supabase.from("resellers").select("id,display_name,email,phone,status").in("parent_id", ids1);
    if (lvl2Res.error) throw lvl2Res.error;
    const lvl2 = (lvl2Res.data ?? []) as ResellerRow[];
    lvl2.forEach((r) => result.push({ id: r.id, name: r.display_name, email: r.email, phone: r.phone, status: r.status, level: 2 }));
    if (lvl2.length) {
      const ids2 = lvl2.map((r) => r.id);
      const lvl3Res = await supabase.from("resellers").select("id,display_name,email,phone,status").in("parent_id", ids2);
      if (lvl3Res.error) throw lvl3Res.error;
      ((lvl3Res.data ?? []) as ResellerRow[]).forEach((r) => result.push({ id: r.id, name: r.display_name, email: r.email, phone: r.phone, status: r.status, level: 3 }));
    }
  }
  return result;
};

// ---------- Resellers (admin) ----------

export type AdminSellerRow = {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  seller_stores: { id: string; store_name: string; store_slug: string; status: string }[] | null;
};

export const loadAllSellers = async (): Promise<AdminSellerRow[]> => {
  const { data, error } = await supabase
    .from("resellers")
    .select("id,display_name,email,phone,status,created_at,seller_stores(id,store_name,store_slug,status)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminSellerRow[];
};

export const updateResellerStatus = async (resellerId: string, status: "approved" | "pending" | "blocked") => {
  const { error } = await supabase.from("resellers").update({ status }).eq("id", resellerId);
  if (error) throw error;
  // Reflect on store
  await supabase.from("seller_stores").update({ status }).eq("reseller_id", resellerId);
};
