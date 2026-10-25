# Integração JF — etapa 1: consulta administrativa

Implementação isolada no Orus. Não executar migrations, deploys ou alterações no projeto JF/Monile nesta etapa.

## Homologação

1. Usar a branch `integration/jf-catalog-readonly` em ambiente de homologação do Orus.
2. Manter todas as configurações atuais do banco e autenticação do Orus.
3. Nesse ambiente apenas, configurar `VITE_JF_CATALOG_PREVIEW_ENABLED=true` e `VITE_JF_SUPABASE_PUBLISHABLE_KEY` com a chave publishable pública do projeto JF `wbvnvmyhqshzacgjexec`. Nunca usar service_role/secret.
4. Abrir Configurações > Geral como administrador e clicar em Consultar catálogo JF.
5. Conferir SKU, fotos e estoque por aro/tamanho com a JF. A consulta usa os acessos públicos existentes e respeita RLS; não ampliar permissões em caso de falha.

A prévia é desativada por padrão e não consulta automaticamente. Faz GET paginado, sem cookies, sem sessão do Orus, sem persistência e sem sincronização de cadastros. Não consulta preços, clientes, pedidos, rede ou comissões. Produtos exigem `active=true` e `catalog_origin=jf_metais`.

O estoque exibido é uma consulta pontual, não uma reserva. Produtos com variações usam a soma das variações ativas; produtos simples usam o saldo do produto. A interface não oferece importação, carrinho ou compra desses itens. Os fluxos existentes do Orus não consomem a prévia.

## Etapas seguintes (não implementadas)

- Mapear IDs externos de produtos/variações sem misturá-los aos IDs locais do Orus.
- Definir produtos habilitados e preços próprios do Orus, além da classificação de material exigida pelas comissões.
- Projetar reserva/baixa central e idempotente compatível com o checkout da JF e da Monile. Validar concorrência pela última peça, expiração, pagamento e cancelamento em ambiente isolado antes de habilitar vendas.
- Tratar cancelamentos, devoluções e comissões sem baixas ou estornos duplicados.

Não basta exibir o estoque para habilitar vendas compartilhadas. Nenhuma venda JF deve ser ativada no Orus até essas etapas serem verificadas.
