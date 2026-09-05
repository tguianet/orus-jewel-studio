import { supabase } from "@/integrations/supabase/client";
import type { StudioNode, StudioPageDocument } from "../types/document";

export const HOME_PAGE_TYPE = "home";

/**
 * As tabelas store_studio_pages/store_studio_versions e a RPC publish_studio_page vêm da
 * migração 20260811120000_studio_documents.sql — os tipos gerados do Supabase só as
 * reconhecerão após essa migração ser aplicada no Cloud e `supabase gen types` rodar de novo.
 * Até lá, usamos um cast local só aqui para não perder a tipagem forte no resto do arquivo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type StudioPageRow = {
  id: string;
  store_id: string;
  page_type: string;
  draft_nodes: StudioNode[];
  published_nodes: StudioNode[] | null;
  published_version: number;
  updated_at: string;
};

export async function loadStudioDraft(storeId: string, pageType = HOME_PAGE_TYPE): Promise<StudioPageDocument | null> {
  const { data, error } = await db
    .from("store_studio_pages")
    .select("id, store_id, page_type, draft_nodes, published_nodes, published_version, updated_at")
    .eq("store_id", storeId)
    .eq("page_type", pageType)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as StudioPageRow;
  return {
    id: row.id,
    storeId: row.store_id,
    pageType: row.page_type,
    version: row.published_version,
    nodes: row.draft_nodes || [],
    updatedAt: row.updated_at,
  };
}

export async function saveDraftNodes(storeId: string, pageType: string, nodes: StudioNode[]): Promise<void> {
  const { error } = await db.from("store_studio_pages").upsert(
    {
      store_id: storeId,
      page_type: pageType,
      draft_nodes: nodes,
    },
    { onConflict: "store_id,page_type", ignoreDuplicates: false },
  );
  if (error) throw error;
}

export async function publishStudioDocument(storeId: string, pageType: string, nodes: StudioNode[]): Promise<number> {
  const { data, error } = await db.rpc("publish_studio_page", {
    p_store_id: storeId,
    p_page_type: pageType,
    p_nodes: nodes,
  });
  if (error) throw error;
  return (data as { published_version: number } | number | null) as unknown as number;
}

export async function listStudioVersions(storeId: string, pageType = HOME_PAGE_TYPE) {
  const { data, error } = await db
    .from("store_studio_versions")
    .select("id, version, label, created_at")
    .eq("store_id", storeId)
    .eq("page_type", pageType)
    .order("version", { ascending: false });
  if (error) throw error;
  return data || [];
}
