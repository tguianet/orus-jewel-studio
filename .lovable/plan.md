## Objetivo
Adicionar a possibilidade de excluir produtos em massa na página **Admin → Produtos**, especialmente útil para limpar uma categoria inteira (ex: "Cadastro em massa" com 848 itens).

## O que será adicionado

### 1. Botão "Excluir categoria" (ação rápida)
- Aparece ao lado do contador de produtos quando uma categoria específica está selecionada (não aparece em "Todas").
- Texto: `Excluir todos da categoria "<nome>" (<n>)`.
- Abre um diálogo de confirmação exigindo digitar o nome da categoria para confirmar (proteção contra clique acidental).
- Exclui todos os produtos da categoria atual em lote.

### 2. Modo seleção múltipla
- Botão **"Selecionar"** ativa um modo onde cada card de produto mostra um checkbox.
- Botões auxiliares: **Selecionar todos** (da visualização atual filtrada) e **Limpar seleção**.
- Barra fixa no topo mostrando `X produtos selecionados` + botão **Excluir selecionados** (vermelho).
- Confirmação antes de excluir.

### 3. Comportamento da exclusão
- Remove os registros da tabela `products` em lote (`.in('id', ids)`).
- Também limpa vínculos em `store_products` para esses produtos (evita órfãos nas lojas das sacoleiras).
- Toast de sucesso com a quantidade excluída e recarrega a lista.
- Em caso de erro, mostra toast com a mensagem.

## Onde será feito
- `src/pages/admin/AdminProducts.tsx` — toda a UI (botões, modo seleção, diálogos) e lógica de exclusão.

## Fora de escopo
- Não altera estrutura do banco nem RLS (as policies atuais já permitem admin deletar).
- Não mexe em produtos de sacoleiras individuais (apenas catálogo do atacado, `seller_store_id IS NULL`).
- Não toca em pedidos já feitos (`order_items` guarda `product_name` próprio).
