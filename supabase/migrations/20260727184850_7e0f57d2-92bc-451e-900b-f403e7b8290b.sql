CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_uuid uuid := NULL;
  parent_raw text := NULLIF(NEW.raw_user_meta_data ->> 'parent_reseller_id', '');
  referral_raw text := NULLIF(NEW.raw_user_meta_data ->> 'referral_code', '');
  display text := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1), '');
  phone_text text := NEW.raw_user_meta_data ->> 'phone';
  base_slug text; final_slug text; i int := 0;
  reseller_uuid uuid; v_sponsor record; v_code text;
  v_inserted boolean := false;
BEGIN
  v_code := COALESCE(referral_raw, parent_raw);
  IF v_code IS NOT NULL THEN
    SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(v_code) LIMIT 1;
    IF v_sponsor.reason = 'ok' THEN
      parent_uuid := v_sponsor.sponsor_reseller_id;
    ELSE
      RAISE EXCEPTION 'referral_invalid:%', COALESCE(v_sponsor.reason, 'not_found')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, display, phone_text) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sacoleira'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.resellers (user_id, display_name, email, phone, parent_id, status)
  VALUES (NEW.id, display, NEW.email, phone_text, parent_uuid, 'pending')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO reseller_uuid;

  IF reseller_uuid IS NULL THEN
    SELECT id INTO reseller_uuid FROM public.resellers WHERE user_id = NEW.id LIMIT 1;
    IF parent_uuid IS NOT NULL THEN
      UPDATE public.resellers SET parent_id = parent_uuid, updated_at = now()
      WHERE id = reseller_uuid AND parent_id IS NULL;
    END IF;
  END IF;

  base_slug := regexp_replace(lower(coalesce(display, split_part(NEW.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'loja'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.seller_stores s WHERE s.owner_user_id = NEW.id) THEN
    final_slug := base_slug;
    WHILE i < 25 AND NOT v_inserted LOOP
      BEGIN
        INSERT INTO public.seller_stores (owner_user_id, reseller_id, store_name, store_slug, contact_phone, status, theme)
        VALUES (NEW.id, reseller_uuid, COALESCE(NULLIF(display, ''), 'Minha loja'), final_slug, phone_text,
          'pending'::public.seller_store_status,
          jsonb_build_object('primaryColor', '#d4a747', 'secondaryColor', '#f5e6c8'));
        v_inserted := true;
      EXCEPTION
        WHEN unique_violation THEN
          i := i + 1;
          IF i >= 20 THEN
            final_slug := base_slug || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
          ELSE
            final_slug := base_slug || '-' || (i + 1)::text;
          END IF;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END; $function$;