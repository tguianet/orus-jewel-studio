import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/types/commerce";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  description: string | null;
};

export const loadCategories = async (): Promise<Category[]> => {
  const [{ data: rows, error }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,active,description")
      .is("seller_store_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("products").select("category_id,category_name").eq("status", "active"),
  ]);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (product.category_id) {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
  }

  return ((rows ?? []) as CategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    description: row.description,
    count: counts.get(row.id) ?? 0,
  }));
};

export const createCategory = async (input: { name: string; description?: string }): Promise<Category> => {
  const name = input.name.trim();
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      active: true,
      seller_store_id: null,
    })
    .select("id,name,slug,active,description")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    active: data.active,
    description: data.description,
    count: 0,
  };
};
