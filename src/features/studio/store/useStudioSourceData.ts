import { useEffect, useState } from "react";
import { loadStoreProducts, type CloudStoreProduct } from "@/lib/cloudStore";
import type { StudioDataContext } from "../registry/types";

type Options = {
  storeId: string | null;
  storeSlug: string | null;
  storeName: string;
  phone?: string | null;
};

export function useStudioSourceData({ storeId, storeSlug, storeName, phone }: Options) {
  const [products, setProducts] = useState<CloudStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!storeId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadStoreProducts(storeId)
      .then((items) => mounted && setProducts(items))
      .catch(() => mounted && setProducts([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [storeId]);

  const collections = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  const data: StudioDataContext = {
    store: { storeName, phone },
    storeSlug: storeSlug || "",
    products,
    collections,
  };

  return { data, loading };
}
