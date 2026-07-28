CREATE OR REPLACE FUNCTION public.admin_get_jewelry_material_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_total integer;
  v_pending integer;
  v_gold integer;
  v_silver integer;
  v_plated integer;
  v_pending_active integer;
  v_pending_inactive integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE jewelry_material IS NULL)::integer,
    COUNT(*) FILTER (WHERE jewelry_material = 'gold'::public.jewelry_material)::integer,
    COUNT(*) FILTER (WHERE jewelry_material = 'silver'::public.jewelry_material)::integer,
    COUNT(*) FILTER (WHERE jewelry_material = 'plated'::public.jewelry_material)::integer,
    COUNT(*) FILTER (WHERE jewelry_material IS NULL AND status = 'active'::public.product_status)::integer,
    COUNT(*) FILTER (WHERE jewelry_material IS NULL AND status = 'inactive'::public.product_status)::integer
  INTO
    v_total, v_pending, v_gold, v_silver, v_plated,
    v_pending_active, v_pending_inactive
  FROM public.products
  WHERE seller_store_id IS NULL;

  RETURN jsonb_build_object(
    'total', v_total,
    'pending', v_pending,
    'gold', v_gold,
    'silver', v_silver,
    'plated', v_plated,
    'pending_active', v_pending_active,
    'pending_inactive', v_pending_inactive
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_jewelry_material_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_jewelry_material_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_jewelry_material_summary() TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_get_jewelry_material_summary() IS
  'Resumo de classificação jewelry_material do catálogo atacado (admin only).';

CREATE OR REPLACE FUNCTION public.admin_bulk_set_jewelry_material(
  p_product_ids uuid[],
  p_jewelry_material text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mat public.jewelry_material;
  v_actor uuid := auth.uid();
  v_ids uuid[];
  v_updated integer := 0;
  v_requested integer;
  v_found integer;
  v_before jsonb;
  v_sample_ids uuid[];
  v_not_found uuid[];
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Apenas administradores podem classificar o tipo da joia';
  END IF;

  IF p_jewelry_material IS NULL OR p_jewelry_material NOT IN ('gold', 'silver', 'plated') THEN
    RAISE EXCEPTION 'jewelry_material inválido. Use gold, silver ou plated';
  END IF;
  v_mat := p_jewelry_material::public.jewelry_material;

  IF p_product_ids IS NULL OR cardinality(p_product_ids) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um product_id';
  END IF;

  SELECT ARRAY(SELECT DISTINCT x FROM unnest(p_product_ids) AS t(x) WHERE x IS NOT NULL)
  INTO v_ids;

  v_requested := COALESCE(cardinality(v_ids), 0);
  IF v_requested = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um product_id válido';
  END IF;
  IF v_requested > 100 THEN
    RAISE EXCEPTION 'Máximo de 100 produtos por lote';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'jewelry_material', p.jewelry_material,
    'status', p.status
  )), '[]'::jsonb)
  INTO v_before
  FROM (
    SELECT id, code, jewelry_material, status
    FROM public.products
    WHERE id = ANY (v_ids)
      AND seller_store_id IS NULL
    ORDER BY code
    LIMIT 25
  ) p;

  SELECT COUNT(*)::integer INTO v_found
  FROM public.products
  WHERE id = ANY (v_ids)
    AND seller_store_id IS NULL;

  SELECT ARRAY(
    SELECT u FROM unnest(v_ids) AS u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = u AND p.seller_store_id IS NULL
    )
  ) INTO v_not_found;

  UPDATE public.products p
  SET
    jewelry_material = v_mat,
    updated_at = now()
  WHERE p.id = ANY (v_ids)
    AND p.seller_store_id IS NULL
    AND p.jewelry_material IS DISTINCT FROM v_mat;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT ARRAY(
    SELECT p.id FROM public.products p
    WHERE p.id = ANY (v_ids) AND p.seller_store_id IS NULL
    ORDER BY p.code
    LIMIT 25
  ) INTO v_sample_ids;

  PERFORM public.write_audit_log(
    'admin_bulk_set_jewelry_material',
    'products',
    'bulk:' || v_requested::text,
    v_before,
    jsonb_build_object(
      'jewelry_material', v_mat,
      'updated_count', v_updated,
      'sample_ids', to_jsonb(v_sample_ids)
    ),
    jsonb_build_object(
      'source', 'admin_bulk_set_jewelry_material',
      'updated_by', v_actor,
      'actor_id', v_actor,
      'requested', v_requested,
      'found', v_found,
      'updated', v_updated,
      'unchanged', GREATEST(v_found - v_updated, 0),
      'not_found_count', COALESCE(cardinality(v_not_found), 0),
      'jewelry_material', v_mat,
      'only_column', 'jewelry_material'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'jewelry_material', v_mat,
    'updated_by', v_actor,
    'requested', v_requested,
    'found', v_found,
    'updated', v_updated,
    'unchanged', GREATEST(v_found - v_updated, 0),
    'not_found', to_jsonb(COALESCE(v_not_found, ARRAY[]::uuid[])),
    'failed', '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_set_jewelry_material(uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_bulk_set_jewelry_material(uuid[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_set_jewelry_material(uuid[], text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_bulk_set_jewelry_material(uuid[], text) IS
  'Admin: define jewelry_material em lote (máx 100). Só catálogo atacado. Audit + updated_by em metadata.';