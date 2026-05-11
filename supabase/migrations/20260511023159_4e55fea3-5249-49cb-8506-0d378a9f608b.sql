CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta_role text := COALESCE(NEW.raw_user_meta_data ->> 'role', 'sacoleira');
  parent_uuid uuid := NULLIF(NEW.raw_user_meta_data ->> 'parent_reseller_id','')::uuid;
  display text := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email,'@',1),'');
  phone_text text := NEW.raw_user_meta_data ->> 'phone';
  base_slug text;
  final_slug text;
  i int := 0;
  reseller_uuid uuid;
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, display, phone_text)
  ON CONFLICT DO NOTHING;

  IF meta_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sacoleira')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.resellers (user_id, display_name, email, phone, parent_id, status)
  VALUES (NEW.id, display, NEW.email, phone_text, parent_uuid, 'approved')
  RETURNING id INTO reseller_uuid;

  -- generate unique slug WITHOUT unaccent (avoids transaction abort)
  base_slug := regexp_replace(lower(coalesce(display, split_part(NEW.email,'@',1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'loja'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.seller_stores WHERE store_slug = final_slug) LOOP
    i := i + 1;
    final_slug := base_slug || '-' || i::text;
  END LOOP;

  INSERT INTO public.seller_stores (owner_user_id, reseller_id, store_name, store_slug, contact_phone, status, theme)
  VALUES (NEW.id, reseller_uuid, COALESCE(display,'Minha loja'), final_slug, phone_text, 'approved'::seller_store_status,
    jsonb_build_object('primaryColor','#d4a747','secondaryColor','#f5e6c8'));

  RETURN NEW;
END;
$function$;