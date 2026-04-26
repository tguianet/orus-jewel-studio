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
      const category = product.categories?.name || "Joias";
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