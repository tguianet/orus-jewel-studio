REVOKE ALL ON FUNCTION public._legal_pepper() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._legal_pepper() FROM anon;
REVOKE ALL ON FUNCTION public._legal_pepper() FROM authenticated;
GRANT EXECUTE ON FUNCTION public._legal_pepper() TO service_role;

REVOKE ALL ON FUNCTION public._legal_hash(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._legal_hash(text) FROM anon;
REVOKE ALL ON FUNCTION public._legal_hash(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._legal_hash(text) TO service_role;

REVOKE ALL ON TABLE public.legal_privacy_config FROM PUBLIC;
REVOKE ALL ON TABLE public.legal_privacy_config FROM anon;
REVOKE ALL ON TABLE public.legal_privacy_config FROM authenticated;
GRANT ALL ON TABLE public.legal_privacy_config TO service_role;

ALTER TABLE public.legal_privacy_config ENABLE ROW LEVEL SECURITY;