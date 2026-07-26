REVOKE ALL ON FUNCTION public._withdrawal_actor_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._log_withdrawal_audit(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._validate_payment_details(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._wallet_available_for_update(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._is_safe_receipt_url(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._release_withdrawal_hold(public.withdrawal_requests, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public._withdrawal_actor_role() TO service_role;
GRANT EXECUTE ON FUNCTION public._log_withdrawal_audit(uuid, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public._validate_payment_details(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public._wallet_available_for_update(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._is_safe_receipt_url(text) TO service_role;
GRANT EXECUTE ON FUNCTION public._release_withdrawal_hold(public.withdrawal_requests, text) TO service_role;