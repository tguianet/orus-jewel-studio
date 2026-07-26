-- =============================================================================
-- Checklist — código de indicação obrigatório
-- Pré-requisito: 20260806120000_required_referral_code.sql aplicada no Lovable Cloud
-- NÃO executar automaticamente em CI sem ambiente preparado.
-- =============================================================================

-- A. código válido permite cadastro
-- SELECT public.validate_referral_code(:codigo_aprovado);
-- Esperado: valid=true, sponsor_reseller_id preenchido, reason=ok
-- SELECT public.register_reseller_with_referral('Nova','nova@test.com','11999999999','senha123',:codigo_aprovado);
-- Esperado: ok=true; reseller com parent_id = sponsor

-- B. código vazio bloqueia
-- SELECT public.validate_referral_code('');
-- Esperado: valid=false, reason=empty
-- SELECT public.register_reseller_with_referral('X','x@test.com',null,'senha123','');
-- Esperado: EXCEPTION 'Código de indicação obrigatório'

-- C. código inexistente bloqueia
-- SELECT public.validate_referral_code('ZZZZZZZZ');
-- Esperado: valid=false, reason=not_found

-- D. código inativo bloqueia (sponsor pending)
-- UPDATE resellers SET status='pending' WHERE id=:sponsor;
-- SELECT public.validate_referral_code(:codigo);
-- Esperado: reason=inactive
-- Restaurar status depois.

-- E. código bloqueado bloqueia
-- UPDATE resellers SET status='blocked' WHERE id=:sponsor;
-- SELECT public.validate_referral_code(:codigo);
-- Esperado: reason=blocked
-- ou can_receive_referrals=false → reason=blocked

-- F. código é normalizado
-- SELECT public.normalize_referral_code('  ab cd  '); -- ABCD
-- SELECT public.validate_referral_code('  ' || lower(:codigo) || '  ');
-- Esperado: mesmo sponsor do código UPPER sem espaços

-- G. patrocinadora correta é vinculada
-- Após register: SELECT parent_id FROM resellers WHERE email='nova@test.com';
-- Esperado: = sponsor_reseller_id retornado na validação

-- H. autoindicação é bloqueada
-- Autenticada como reseller A: SELECT set_my_reseller_parent_by_code(A.referral_code);
-- Esperado: EXCEPTION 'Você não pode se indicar'

-- I. ciclo é bloqueado
-- Árvore A→B→C; tentar admin_set_reseller_sponsor(A, C, 'teste ciclo');
-- Esperado: EXCEPTION ciclo
-- SELECT public.would_create_reseller_cycle(:A, :C); -- true se C desce de A

-- J. cadastro sem sponsor não conclui
-- INSERT auth.users sem referral_code/allow_root → handle_new_user EXCEPTION
-- register sem código → EXCEPTION

-- K. comissões usam a árvore correta
-- Pedido pago na loja da indicada: create_mlm_commissions_for_order
-- N1 = vendedora, N2 = parent_id (patrocinadora), N3 = parent do parent

-- L. dados privados da patrocinadora não vazam
-- SELECT public.validate_referral_code(:codigo);
-- Esperado: JSON sem email/phone; apenas sponsor_name/store_name/ids públicos

-- M. tentativas excessivas são limitadas
-- Loop >40 validate_referral_code com mesmo p_client_key em 15 min
-- Esperado: reason=rate_limited

-- N. admin pode criar usuário raiz apenas por fluxo administrativo
-- SELECT public.admin_create_root_reseller(:user_id,'Nome','Loja','slug-raiz','motivo auditável');
-- Esperado: ok; parent_id NULL permitido
-- Cadastro público NÃO pode criar raiz (sem allow_root_without_sponsor)

-- Regeneração invalida código antigo
-- SELECT admin_regenerate_referral_code(:reseller_id, 'teste');
-- SELECT validate_referral_code(:codigo_antigo); -- inactive ou not_found
-- SELECT validate_referral_code(:codigo_novo); -- ok se approved
