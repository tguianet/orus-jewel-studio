-- Checklist de validação do fluxo de cadastro (handle_new_user).
-- Somente leitura: nenhum dado é alterado.

-- 1) Slug duplicado: garantir unicidade e sufixação
select store_slug, count(*) as total
from public.seller_stores
group by store_slug
having count(*) > 1;
-- Esperado: 0 linhas

-- 2) Usuários do Auth sem perfil completo (órfãos / cadastro parcial)
select u.id, u.email, u.created_at,
  (select count(*) from public.profiles p where p.user_id = u.id) as profiles,
  (select count(*) from public.user_roles r where r.user_id = u.id) as roles,
  (select count(*) from public.resellers rs where rs.user_id = u.id) as resellers,
  (select count(*) from public.seller_stores s where s.owner_user_id = u.id) as stores
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
   or not exists (select 1 from public.user_roles r where r.user_id = u.id)
   or not exists (select 1 from public.resellers rs where rs.user_id = u.id)
   or not exists (select 1 from public.seller_stores s where s.owner_user_id = u.id);
-- Esperado: 0 linhas (fora contas administrativas criadas manualmente)

-- 3) Lojas órfãs (sem reseller ou sem dono)
select id, store_slug from public.seller_stores
where reseller_id is null or owner_user_id is null;
-- Esperado: 0 linhas

-- 4) Resellers com parent_id inexistente
select r.id, r.parent_id from public.resellers r
where r.parent_id is not null
  and not exists (select 1 from public.resellers p where p.id = r.parent_id);
-- Esperado: 0 linhas

-- 5) Motivo padronizado de código inválido (deve conter 'referral_invalid:')
select position('referral_invalid:' in pg_get_functiondef(p.oid)) > 0 as has_stable_reason
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'handle_new_user' and n.nspname = 'public';
-- Esperado: true

-- 6) Tratamento de unique_violation no insert da loja
select position('unique_violation' in pg_get_functiondef(p.oid)) > 0 as handles_slug_conflict
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'handle_new_user' and n.nspname = 'public';
-- Esperado: true
