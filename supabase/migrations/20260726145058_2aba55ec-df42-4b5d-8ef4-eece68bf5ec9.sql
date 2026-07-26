CREATE OR REPLACE FUNCTION public.admin_get_expired_orders_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_store_id uuid DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired jsonb;
  v_checkout_base int;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);

  SELECT jsonb_build_object(
    'expired_count', COUNT(*),
    'abandoned_amount', COALESCE(SUM(o.total), 0),
    'avg_hours_to_expiry', COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(o.expired_at, o.expires_at) - o.created_at)) / 3600.0), 0),
    'units_released', COALESCE((
      SELECT SUM(ABS(sm.quantity))
      FROM public.stock_movements sm
      JOIN public.orders ox ON ox.id = sm.order_id
      LEFT JOIN public.seller_stores ssx ON ssx.id = ox.seller_store_id
      WHERE sm.movement_type = 'cancel_restore'
        AND ox.expired_at IS NOT NULL
        AND ox.expired_at >= p_start_date AND ox.expired_at < p_end_date
        AND (p_store_id IS NULL OR ox.seller_store_id = p_store_id)
        AND (p_reseller_id IS NULL OR ssx.reseller_id = p_reseller_id)
    ), 0)
  )
  INTO v_expired
  FROM public.orders o
  LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
  WHERE o.expired_at IS NOT NULL
    AND o.expired_at >= p_start_date AND o.expired_at < p_end_date
    AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
    AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id);

  SELECT COUNT(*)::int INTO v_checkout_base
  FROM public.orders o
  LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
  WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
    AND o.origin = 'loja_online'
    AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
    AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id);

  RETURN v_expired || jsonb_build_object(
    'checkout_orders_base', v_checkout_base,
    'abandonment_rate_pct', CASE
      WHEN v_checkout_base > 0 THEN round(((v_expired->>'expired_count')::numeric / v_checkout_base) * 100, 2)
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_expired_orders_report(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_expired_orders_report(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;