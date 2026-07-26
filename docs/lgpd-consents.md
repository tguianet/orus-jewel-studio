# Consentimentos LGPD — Amada Amante

## Arquitetura

Documentos versionados em `legal_documents` + aceites auditáveis em `legal_consents`.  
Checkout público valida e grava consentimentos **na mesma transação** de `create_public_order` (`p_consents`).

**Isto não afirma conformidade jurídica absoluta.** Revisão por advogado/DPO continua recomendada.

## Documentos e audiências

| Tipo | Checkout (customer) | Sacoleira |
|---|---|---|
| privacy_policy | obrigatório | aplicável |
| terms_of_use | obrigatório | aplicável |
| returns_policy | obrigatório | — |
| delivery_policy | obrigatório | — |
| commission_policy | — | contexto MLM |
| withdrawal_policy | — | antes de saque |

## Versionamento

Padrão: **YYYY-MM-DD** (ex.: `2026-07-26`).  
Mudança material → nova versão + novo aceite.  
`content_hash` de documento publicado **não pode ser alterado** (trigger).  
Uma única versão `is_active` por `(document_type, audience)`.

## Evidências e privacidade

- IP / user-agent: apenas **hash** com pepper server-side (`legal_privacy_config`).
- Cliente anônimo: `customer_identifier_hash` (telefone+nome) + `order_id`.
- Frontend não recebe hashes sensíveis de IP/UA.
- Pepper não é exposto; sem prometer anonimização absoluta se o Cloud não isolar o segredo.

## RPCs

`get_active_legal_documents`, `validate_checkout_consents`, `record_checkout_consents`,  
`record_authenticated_consent`, `get_my_consents`, `admin_list_legal_consents`,  
`admin_list_legal_documents`, `publish_legal_document_version`, `revoke_legal_consent`,  
`has_active_consent_for`.

## Checkout

Frontend carrega documentos ativos (versão/hash do banco), exige aceite por documento e envia:

```json
[{ "document_type", "version", "content_hash", "accepted": true }]
```

Se versão/hash mudarem: *“Os termos foram atualizados. Revise e aceite novamente.”*

## Revogação

Admin via RPC. Consentimento de **checkout com pedido** não é revogável destrutivamente (integridade).

## Checklist Cloud

1. Aplicar `20260801120000_legal_consents.sql` **depois** das migrations de checkout/saques pendentes.  
2. Rodar `supabase/tests/legal_consents_checklist.sql`.  
3. Publicar frontend.  
4. Smoke: checkout com 4 termos; publicar nova versão; aceitar na sacoleira; saque exige política.

## Limitações

- Sem upload de PDF versionado no storage nesta fase (hash de fingerprint canônico).  
- IP no checkout público não é capturado no browser por padrão (hashes ficam nulos se não enviados).  
- Revisão jurídica externa recomendada.
