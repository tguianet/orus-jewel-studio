import ringImg from "@/assets/product-ring.jpg";
import earringsImg from "@/assets/product-earrings.jpg";
import necklaceImg from "@/assets/product-necklace.jpg";
import braceletImg from "@/assets/product-bracelet.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Product, Sacoleira } from "@/lib/mockData";

const imageByCategory = (category?: string | null) => {
  const name = (category || "").toLowerCase();
  if (name.includes("brinco")) return earringsImg;
  if (name.includes("colar")) return necklaceImg;
  if (name.includes("pulseira")) return braceletImg;
  return ringImg;
};

export type CloudStoreProduct = Product & { resellerPrice: number; sellerStoreId: string };

export const mapStore = (row: any): Sacoleira => ({
  id: row.id,
  profileId: row.reseller_id || row.owner_user_id,
  parentId: row.resellers?.parent_id || null,
  name: row.resellers?.display_name || row.store_name,
  storeName: row.store_name,
  storeSlug: row.store_slug,
  email: row.resellers?.email || "",
  phone: row.contact_phone || row.resellers?.phone || "",
  status: row.status,
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
  const { data, error } = await supabase
    .from("seller_stores")
    .select("*, resellers(*)")
    .eq("store_slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) return null;
  return mapStore(data);
};

export const loadStoreProducts = async (sellerStoreId: string): Promise<CloudStoreProduct[]> => {
  const { data, error } = await supabase
    .from("store_products")
    .select("id, resale_price, seller_store_id, active, products(*, categories(name))")
    .eq("seller_store_id", sellerStoreId)
    .eq("active", true);

  if (error || !data) return [];

  return data
    .map((item: any) => {
      const product = item.products;
      if (!product || product.status !== "active") return null;
      const category = product.categories?.name || product.category_name || "Joias";
      return {
        id: product.id,
        code: product.code,
        name: product.name,
        category,
        description: product.description,
        costPrice: Number(product.cost_price || 0),
        wholesalePrice: Number(product.wholesale_price || 0),
        suggestedPrice: Number(product.suggested_price || 0),
        stock: Number(product.stock || 0),
        minOrder: Number(product.min_order || 1),
        image: product.image_url || imageByCategory(category),
        active: product.status === "active",
        resellerPrice: Number(item.resale_price || product.suggested_price || 0),
        sellerStoreId: item.seller_store_id,
      };
    })
    .filter(Boolean) as CloudStoreProduct[];
};

// ---------- Admin / catalog ----------

export type CatalogProduct = Product & { selected: boolean; storeProductId?: string; resellerPrice: number };

export const loadAdminProducts = async (): Promise<Product[]> => {
  const { data } = await supabase
    .from("products")
    .select("id,code,name,description,cost_price,wholesale_price,suggested_price,stock,min_order,image_url,category_name,status")
    .order("created_at", { ascending: false });
  return (data ?? []).map((p: any) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category_name || "Joias",
    description: p.description,
    costPrice: Number(p.cost_price || 0),
    wholesalePrice: Number(p.wholesale_price || 0),
    suggestedPrice: Number(p.suggested_price || 0),
    stock: Number(p.stock || 0),
    minOrder: Number(p.min_order || 1),
    image: p.image_url || imageByCategory(p.category_name),
    active: p.status === "active",
  }));
};

export const loadCatalogForStore = async (storeId: string): Promise<CatalogProduct[]> => {
  const [{ data: products }, { data: links }] = await Promise.all([
    supabase
      .from("products")
      .select("id,code,name,description,cost_price,wholesale_price,suggested_price,stock,min_order,image_url,category_name,status")
      .eq("status", "active")
      .is("seller_store_id", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("store_products")
      .select("id,product_id,resale_price,active")
      .eq("seller_store_id", storeId),
  ]);
  const linkByProduct = new Map<string, { id: string; price: number; active: boolean }>(
    (links ?? []).map((l: any) => [l.product_id, { id: l.id, price: Number(l.resale_price || 0), active: l.active }])
  );
  return (products ?? []).map((p: any) => {
    const link = linkByProduct.get(p.id);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category_name || "Joias",
      description: p.description,
      costPrice: Number(p.cost_price || 0),
      wholesalePrice: Number(p.wholesale_price || 0),
      suggestedPrice: Number(p.suggested_price || 0),
      stock: Number(p.stock || 0),
      minOrder: Number(p.min_order || 1),
      image: p.image_url || imageByCategory(p.category_name),
      active: p.status === "active",
      selected: !!link?.active,
      storeProductId: link?.id,
      resellerPrice: link?.price || Number(p.suggested_price || 0),
    };
  });
};

export const toggleStoreProduct = async (
  storeId: string,
  productId: string,
  payload: { active: boolean; resalePrice: number; storeProductId?: string }
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
  const { data } = await supabase
    .from("orders")
    .select("id,customer_name,customer_phone,total,status,created_at,order_items(id)")
    .eq("seller_store_id", storeId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((o: any) => ({
    id: o.id,
    customer: o.customer_name,
    phone: o.customer_phone,
    date: o.created_at,
    items: o.order_items?.length ?? 0,
    total: Number(o.total || 0),
    status: o.status,
  }));
};

export const loadAllOrders = async () => {
  const { data } = await supabase
    .from("orders")
    .select("id,customer_name,customer_phone,total,status,created_at,seller_store_id,seller_stores(store_name)")
    .order("created_at", { ascending: false });
  return data ?? [];
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
};

// ---------- Wallet ----------

export type WalletSummary = { pending: number; available: number; paid: number; total: number };
export type WalletTx = { id: string; type: string; amount: number; status: string; description: string; created_at: string };

export const loadWalletForReseller = async (resellerId: string) => {
  const [{ data: summary }, { data: txs }] = await Promise.all([
    supabase.from("reseller_wallet_summary").select("*").eq("reseller_id", resellerId).maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id,type,amount,status,description,created_at")
      .eq("reseller_id", resellerId)
      .order("created_at", { ascending: false }),
  ]);
  return {
    summary: {
      pending: Number(summary?.pending || 0),
      available: Number(summary?.available || 0),
      paid: Number(summary?.paid || 0),
      total: Number(summary?.total_balance || 0),
    } as WalletSummary,
    transactions: (txs ?? []) as WalletTx[],
  };
};

// ---------- Network (MLM) ----------

export type NetworkMember = { id: string; name: string; email: string; status: string; level: number };

export const loadNetwork = async (rootResellerId: string): Promise<NetworkMember[]> => {
  // Three levels via three queries (small N)
  const result: NetworkMember[] = [];
  const lvl1Res = await supabase.from("resellers").select("id,display_name,email,status").eq("parent_id", rootResellerId);
  const lvl1 = lvl1Res.data ?? [];
  lvl1.forEach((r: any) => result.push({ id: r.id, name: r.display_name, email: r.email, status: r.status, level: 1 }));
  if (lvl1.length) {
    const ids1 = lvl1.map((r: any) => r.id);
    const lvl2Res = await supabase.from("resellers").select("id,display_name,email,status").in("parent_id", ids1);
    const lvl2 = lvl2Res.data ?? [];
    lvl2.forEach((r: any) => result.push({ id: r.id, name: r.display_name, email: r.email, status: r.status, level: 2 }));
    if (lvl2.length) {
      const ids2 = lvl2.map((r: any) => r.id);
      const lvl3Res = await supabase.from("resellers").select("id,display_name,email,status").in("parent_id", ids2);
      (lvl3Res.data ?? []).forEach((r: any) => result.push({ id: r.id, name: r.display_name, email: r.email, status: r.status, level: 3 }));
    }
  }
  return result;
};

// ---------- Resellers (admin) ----------

export const loadAllSellers = async () => {
  const { data } = await supabase
    .from("resellers")
    .select("id,display_name,email,phone,status,created_at,seller_stores(id,store_name,store_slug,status)")
    .order("created_at", { ascending: false });
  return data ?? [];
};

export const updateResellerStatus = async (resellerId: string, status: "approved" | "pending" | "blocked") => {
  const { error } = await supabase.from("resellers").update({ status }).eq("id", resellerId);
  if (error) throw error;
  // Reflect on store
  await supabase.from("seller_stores").update({ status }).eq("reseller_id", resellerId);
};
