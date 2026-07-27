-- =============================================================================
-- Endurecimento explícito dos privilégios LGPD (criptografia / pepper)
-- Idempotente: apenas REVOKE/GRANT — não recria funções, não altera pepper,
-- não cria policies, não mexe em consentimentos.
-- =============================================================================

REVOKE ALL ON FUNCTION public._legal_pepper()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public._legal_hash(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public._legal_pepper()
TO service_role;

GRANT EXECUTE ON FUNCTION public._legal_hash(text)
TO service_role;

REVOKE ALL ON TABLE public.legal_privacy_config
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.legal_privacy_config
TO service_role;
