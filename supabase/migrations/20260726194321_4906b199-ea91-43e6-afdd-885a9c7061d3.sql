REVOKE ALL ON FUNCTION public.resolve_referral_sponsor(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._referral_rate_limit_ok(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_resellers_assign_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_referral_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.would_create_reseller_cycle(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.would_create_reseller_cycle(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text, text) TO anon, authenticated;