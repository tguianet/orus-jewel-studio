-- Checklist LGPD consentimentos (A–W)
-- Aplicar 20260801120000_legal_consents.sql antes. Não rodar em CI automático.

-- A. anon lê documentos ativos públicos
-- SELECT public.get_active_legal_documents('checkout');

-- B. anon não lê consentimentos
-- SET ROLE anon; SELECT * FROM legal_consents; -- 0 / denied

-- C. anon não insere diretamente
-- INSERT INTO legal_consents (...) -- deve falhar (sem policy)

-- D–J. checkout via create_public_order com p_consents válidos / inválidos
-- D válidos → pedido + 4 consents
-- E sem termo → EXCEPTION
-- F versão errada → termos atualizados
-- G hash errado → termos atualizados
-- H documento inativo → falha
-- I retry mesmo checkout_token → idempotente (pedido existente)
-- J falha de consent após insert order → rollback (teste forçado)

-- K/L. sacoleira vê só próprios (get_my_consents / RLS)
-- M. admin_list_legal_consents
-- N/O. publish_legal_document_version + versão anterior is_active=false
-- P. nova versão exige novo aceite (has_active_consent_for false)
-- Q/R. colunas ip_hash/user_agent_hash; sem ip puro
-- S. pedido novo sempre com 4 consents checkout
-- T. UPDATE/DELETE direto em legal_consents bloqueado
-- U. revoke_legal_consent preserva linha + revoked_at
-- V. índices únicos active / checkout
-- W. UPDATE content_hash em publicado → EXCEPTION

SELECT 'legal_consents_checklist loaded' AS info;
