import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import heroImg from "@/assets/hero-jewelry.jpg";
import { CloudStoreProduct, loadStoreProducts } from "@/lib/cloudStore";
import { DEFAULT_BANNER, StoreTheme, defaultTheme } from "@/lib/storeTheme";
import type { Sacoleira } from "@/types/commerce";
import { StoreTemplateRenderer } from "@/components/store/templates/StoreTemplateRenderer";
import { normalizeStoreTemplateKey } from "@/components/store/templates/types";

export type StoreOutletContext = {
  store: Sacoleira;
  theme?: StoreTheme;
  banner?: string;
  templateKey?: string;
};

const StoreHome = () => {
  const { store, theme, banner, templateKey } = useOutletContext<StoreOutletContext>();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const t = { ...defaultTheme, ...(theme || {}) };

  const banners = useMemo(() => {
    const list = [
      ...((t.bannerUrls || []).filter(Boolean)),
      ...(t.bannerUrl && !(t.bannerUrls || []).includes(t.bannerUrl) ? [t.bannerUrl] : []),
    ];
    if (list.length === 0) list.push(banner || DEFAULT_BANNER || heroImg);
    return list;
  }, [t.bannerUrls, t.bannerUrl, banner]);

  const [cloudProducts, setCloudProducts] = useState<CloudStoreProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");

  useEffect(() => {
    let mounted = true;
    setProductsLoading(true);
    setProductsError(null);
    loadStoreProducts(store.id)
      .then((items) => {
        if (mounted) setCloudProducts(items);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setCloudProducts([]);
        setProductsError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
      })
      .finally(() => {
        if (mounted) setProductsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [store.id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    cloudProducts.forEach((p) => p.category && set.add(p.category));
    return ["Todos", ...Array.from(set)];
  }, [cloudProducts]);

  const collections = categories.filter((c) => c !== "Todos").slice(0, 6);

  const filteredProducts = useMemo(() => {
    const byCategory =
      activeCategory === "Todos"
        ? cloudProducts
        : cloudProducts.filter((p) => p.category === activeCategory);
    if (!query) return byCategory;
    return byCategory.filter((p) =>
      [p.name, p.category, p.code, p.id]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(query)),
    );
  }, [cloudProducts, activeCategory, query]);

  const resolvedKey = normalizeStoreTemplateKey(templateKey ?? store.templateKey);

  return (
    <StoreTemplateRenderer
      templateKey={resolvedKey}
      store={store}
      theme={t}
      banners={banners}
      products={cloudProducts}
      filteredProducts={filteredProducts}
      categories={categories}
      collections={collections}
      activeCategory={activeCategory}
      onActiveCategoryChange={setActiveCategory}
      query={query}
      productsLoading={productsLoading}
      productsError={productsError}
    />
  );
};

export default StoreHome;
