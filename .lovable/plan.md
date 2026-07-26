## Objetivo

Aplicar exclusivamente a migration já versionada `supabase/migrations/20260725220000_commission_settings.sql`, sem tocar em pedidos, estoque, checkout, produtos ou usuários.

## Verificações já feitas (antes de aplicar)

- `public.commission_settings` **não existe** (`to_regclass` retornou vazio).
- `get_current_commission_rates` e `update_commission_settings` **não existem** no schema `public`.
- `create_mlm_commissions_for_order` já existe e será substituída via `CREATE OR REPLACE` (mesma assinatura).
- Em `public.commissions` existe hoje `commissions_rate_check` (limita taxas a 0.10/0.05/0.02) e **não** existe `commissions_rate_range_check`.
- Dados atuais preservados como baseline: 9 pedidos, 14 comissões.
- É a única migration pendente no repositório sem correspondência no banco; nenhuma outra será enviada.

## O que a migration faz

1. Cria a tabela singleton `commission_settings` (taxas nível 1/2/3 como frações 0–1, `active_from`, `updated_by`), com checks de faixa e de soma ≤ 100%.
2. Insere o seed oficial: `0.25` / `0.03` / `0.02` (com `ON CONFLICT DO NOTHING`).
3. Substitui `commissions_rate_check` por `commissions_rate_range_check` (aceita qualquer taxa de 0 a 1) — apenas troca de constraint, não altera linhas existentes.
4. Ativa RLS, revoga acesso de `anon`/`public` e cria a policy `"Admins can select commission settings"`; escrita apenas via RPC.
5. Cria `update_commission_settings` (admin-only, com auditoria before/after) e `get_current_commission_rates` (leitura para autenticados).
6. Recria `create_mlm_commissions_for_order` para ler as taxas vigentes no momento do pagamento, mantendo `ON CONFLICT DO NOTHING` — comissões já gravadas conservam `rate` e `amount` originais.

## Execução

- Envio do conteúdo do arquivo, sem alterações, via ferramenta de migration do Lovable Cloud (você aprova antes de rodar).
- Nenhum `DROP TABLE`, `DELETE`, `UPDATE` de pedidos/comissões ou recriação de tabelas existentes.

## Verificações depois de aplicar

1. Tabela `public.commission_settings` criada.
2. Funções presentes: `update_commission_settings`, `get_current_commission_rates`, `create_mlm_commissions_for_order`.
3. Policy `"Admins can select commission settings"` existente em `commission_settings`.
4. Constraint `commissions_rate_range_check` presente e `commissions_rate_check` removida.
5. Valores iniciais conferidos: `0.25` / `0.03` / `0.02`.
6. Contagem e soma de `commissions` e `orders` iguais ao baseline (9 pedidos / 14 comissões, `rate` e `amount` inalterados) — nada recalculado.
7. Compilação/typecheck do projeto executada e resultado reportado.
8. Sem publicação automática.

## Notas técnicas

- `src/lib/commissionSettings.ts` já referencia `Tables<"commission_settings">` e as duas RPCs; os tipos do backend são regenerados após a migration, então o typecheck só passa depois de aplicá-la. Se algum erro de tipo restar, reporto sem alterar lógica de negócio.
- Risco residual: a nova constraint de faixa é mais permissiva que a antiga (por design, para permitir taxas configuráveis).

## Entrega final

Relato: se a migration foi aplicada, objetos criados, valores iniciais, resultado da compilação e qualquer erro ou risco restante.
