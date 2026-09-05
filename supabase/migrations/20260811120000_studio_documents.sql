-- Studio V2: documento estruturado da página da loja (editor visual no-code)
-- Lovable Cloud — NÃO aplicar via CLI; aplicar manualmente no Cloud.
-- Não altera seller_stores.theme nem o fluxo de personalização atual (compatibilidade total).

-- Rascunho por loja + tipo de página (hoje só 'home'), com snapshot publicado embutido.
CREATE TABLE IF NOT EXISTS public.store_studio_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.seller_stores(id) ON DELETE CASCADE,
  page_type text NOT NULL DEFAULT 'home',
  draft_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_nodes jsonb NULL,
  published_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_studio_pages_page_type_check CHECK (page_type IN ('home')),
  CONSTRAINT store_studio_pages_store_page_unique UNIQUE (store_id, page_type)
);

COMMENT ON TABLE public.store_studio_pages IS
  'Documento estruturado (árvore de nós) do Studio V2. draft_nodes = estado em edição; published_nodes = último snapshot publicado.';

CREATE INDEX IF NOT EXISTS store_studio_pages_store_idx ON public.store_studio_pages (store_id);

ALTER TABLE public.store_studio_pages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.trg_store_studio_pages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_studio_pages_set_updated_at ON public.store_studio_pages;
CREATE TRIGGER store_studio_pages_set_updated_at
  BEFORE UPDATE ON public.store_studio_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_store_studio_pages_updated_at();

-- Histórico de publicações (append-only), base para versionamento futuro.
CREATE TABLE IF NOT EXISTS public.store_studio_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.seller_stores(id) ON DELETE CASCADE,
  page_type text NOT NULL DEFAULT 'home',
  version integer NOT NULL,
  nodes jsonb NOT NULL,
  label text NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_studio_versions_unique UNIQUE (store_id, page_type, version)
);

COMMENT ON TABLE public.store_studio_versions IS
  'Histórico imutável de snapshots publicados pelo Studio V2 — uma linha por publicação.';

CREATE INDEX IF NOT EXISTS store_studio_versions_store_idx ON public.store_studio_versions (store_id, page_type, version DESC);

ALTER TABLE public.store_studio_versions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS: a sacoleira só acessa o documento da própria loja; admin vê tudo.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.store_studio_pages FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.store_studio_versions FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Seller manages own studio page" ON public.store_studio_pages;
CREATE POLICY "Seller manages own studio page"
ON public.store_studio_pages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = store_studio_pages.store_id AND s.owner_user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = store_studio_pages.store_id AND s.owner_user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Seller reads own studio versions" ON public.store_studio_versions;
CREATE POLICY "Seller reads own studio versions"
ON public.store_studio_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = store_studio_versions.store_id AND s.owner_user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.store_studio_pages TO authenticated;
GRANT SELECT ON TABLE public.store_studio_versions TO authenticated;
GRANT ALL ON TABLE public.store_studio_pages TO service_role;
GRANT ALL ON TABLE public.store_studio_versions TO service_role;

-- ---------------------------------------------------------------------------
-- Publicar: grava snapshot imutável em store_studio_versions e atualiza
-- store_studio_pages.published_nodes/published_version + draft_nodes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_studio_page(
  p_store_id uuid,
  p_page_type text,
  p_nodes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_next_version integer;
  v_row public.store_studio_pages;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = p_store_id AND (s.owner_user_id = v_actor OR public.is_admin(v_actor))
  ) THEN
    RAISE EXCEPTION 'Loja não encontrada ou sem permissão para publicar';
  END IF;

  INSERT INTO public.store_studio_pages (store_id, page_type, draft_nodes, published_nodes, published_version)
  VALUES (p_store_id, p_page_type, p_nodes, p_nodes, 1)
  ON CONFLICT (store_id, page_type) DO UPDATE SET
    draft_nodes = EXCLUDED.draft_nodes,
    published_nodes = EXCLUDED.published_nodes,
    published_version = public.store_studio_pages.published_version + 1
  RETURNING * INTO v_row;

  v_next_version := v_row.published_version;

  INSERT INTO public.store_studio_versions (store_id, page_type, version, nodes, created_by)
  VALUES (p_store_id, p_page_type, v_next_version, p_nodes, v_actor);

  RETURN jsonb_build_object('published_version', v_next_version);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_studio_page(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_studio_page(uuid, text, jsonb) TO authenticated, service_role;
