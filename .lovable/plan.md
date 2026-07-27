## O que já foi verificado (leituras reais, nada alterado)

**Registro do log** (`public.operational_error_logs`, correlation_id `op_20260727_9fc2e81c`):
- `error_code: UNKNOWN_ERROR`, `category: unknown`, `severity: error`, `operation: sign_up`
- `technical_summary: "UNKNOWN_ERROR @ sign_up"`, `sanitized_context: {}` (vazio), `actor_role: anon`, sem `user_id`
- Ou seja: **o log atual não guardou nenhum detalhe** — nem código do Auth, nem SQLSTATE, nem constraint.

**Logs de origem**: consultas ao `auth_logs` e ao `postgres_logs` para 2026-07-27 17:05–17:10 UTC retornam vazio (a retenção só cobre as últimas horas; o registro mais antigo disponível é de 18:41 UTC). **Portanto a mensagem original desse evento específico não é mais recuperável** — qualquer afirmação de causa exata para esse correlation_id seria chute. O diagnóstico abaixo é do *fluxo*, e a instrumentação proposta garante que a próxima ocorrência traga a causa completa.

**Estado do banco no período**: o único usuário criado após 15:00 UTC é `pedroamadaamante@gmail.com` (17:22:26 UTC, código `NPNCMF2L`), e ele está **completo** — 1 profile, 1 role, 1 reseller, 1 seller_store. Não há usuário parcial nem registro órfão desse período. A falha das 17:07 foi ~15 min antes do cadastro bem-sucedido do mesmo perfil, o que é compatível com uma primeira tentativa recusada (código/patrocinadora ainda não aprovada, ou e-mail em estado inválido) seguida de nova tentativa.

**Causas estruturais confirmadas por leitura de código/SQL:**

1. `LoginPage.tsx:182` faz `normalizeError(new Error(error), { operation: "sign_up" })` — o erro do Auth é achatado numa **string** antes de normalizar. `status`, `code` (`user_already_exists`, `unexpected_failure`, `weak_password`…) e qualquer SQLSTATE são descartados. Em `normalizeError`, uma string sem `code`/`status` e sem palavra-chave conhecida cai direto em `UNKNOWN_ERROR` com `metadata` vazio. **Esta é a causa comprovada do log inútil.**
2. `normalizeError` não trata HTTP 400/422/500 do Auth nem as mensagens "User already registered" / "Database error saving new user" — mesmo recebendo o objeto original, hoje classificaria mal.
3. `handle_new_user` levanta `check_violation` com texto em PT ("Código de indicação inválido (%)") quando o código é inválido/inativo/bloqueado. O GoTrue converte qualquer exceção do trigger em **"Database error saving new user" (500)**, mascarando o motivo — o `registerResellerWithReferral` tenta casar `/Código de indicação/i` na mensagem, o que **nunca bate**.
4. `handle_new_user` gera slug com `WHILE EXISTS (...)` — leitura seguida de insert, **sem tratamento de `unique_violation`**. Sob concorrência (ou nomes iguais) pode estourar 23505 e derrubar todo o cadastro.
5. Não há erro de `profiles`/`user_roles`/`resellers` esperado: todos usam `ON CONFLICT DO NOTHING`. O ponto frágil restante é o slug e a exceção do código de indicação.

## Correção proposta

**A. Trigger `handle_new_user` (migration nova, sem recriar o resto do fluxo)**
- Manter o código de indicação obrigatório e o `status = 'pending'` (regra de aprovação inalterada).
- Trocar a exceção genérica por `RAISE EXCEPTION ... USING ERRCODE='23514', MESSAGE='referral_invalid:<reason>'` — texto estável, sem PT, para casar no cliente.
- Envolver o insert de `seller_stores` em bloco `BEGIN … EXCEPTION WHEN unique_violation` com retry de sufixo (`-2`, `-3`, … e fallback `-<8 chars do uuid>`), eliminando a corrida de slug.
- Nada de dados alterados, nenhum usuário existente tocado.

**B. Fluxo de cadastro no cliente**
- `registerResellerWithReferral` passa a devolver o **objeto de erro** (code/status/message), não só string, e mapeia:
  - e-mail existente (`user_already_exists` / "already registered") → **"Este e-mail já está cadastrado."**
  - referral (`referral_invalid:*` ou revalidação falhando) → **"O código de indicação não é mais válido."**
  - erro de trigger/banco ("Database error saving new user", 500) → mensagem amigável + correlation_id
- `LoginPage.tsx` para de fazer `new Error(string)` e passa o erro original para `normalizeError`.
- Nenhuma mensagem técnica chega ao usuário.

**C. Observabilidade (fim do UNKNOWN_ERROR cego)**
- Novos códigos: `AUTH_EMAIL_TAKEN`, `AUTH_SIGNUP_REFERRAL_INVALID`, `AUTH_SIGNUP_DB_ERROR` em `errorCodes.ts` + mensagens PT em `errorMessages.ts`.
- `normalizeError` ganha um ramo de auth/signup que lê `code`, `status`, mensagem e SQLSTATE.
- `sanitized_context` passa a registrar, já sanitizado: `auth_error_code`, `http_status`, `postgres_code`, `constraint`, `operation`, `correlation_id` e `signup_stage` (`auth_user | profile | role | reseller | store | referral_link`). Sem e-mail, sem senha, sem payload bruto.

## Testes

Novo `src/test/signupErrors.test.ts` cobrindo os 10 cenários pedidos (e-mail novo + código válido, e-mail existente, código inválido, patrocinadora bloqueada, slug duplicado, falha de trigger, repetição, ausência de órfãos, mensagem de frontend, log deixar de ser UNKNOWN_ERROR) com o client mockado, mais um checklist SQL `supabase/tests/signup_flow_checklist.sql` para slug duplicado e ausência de órfãos.

Depois: `npm run lint`, `npm run build`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit`, e `git status --short`. Sem commit, sem push, sem publicar.

## Riscos

- A causa exata do evento das 17:07 permanece **não recuperável** (logs expirados); o plano corrige as classes de falha e garante diagnóstico completo na próxima ocorrência.
- Alterar o trigger exige migration (aprovada por você antes de rodar); ela é idempotente e não toca dados existentes.
