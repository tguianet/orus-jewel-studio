## Problema

No `NewProductModal.tsx`, o submit do formulário chama `event.currentTarget.reset()` **depois** de vários `await` (upload de imagem + insert no Supabase). Nesse ponto, o React já anulou `event.currentTarget`, gerando:

`Cannot read properties of null (reading 'reset')`

Isso faz o fluxo cair no `catch` e exibir "Não foi possível salvar o produto.", **mesmo o produto tendo sido salvo no banco**.

## Correção

Em `src/components/NewProductModal.tsx`:

1. Capturar a referência do formulário no início do handler, antes de qualquer `await`:
   ```ts
   const formEl = event.currentTarget;
   ```
2. Usar `formEl.reset()` em vez de `event.currentTarget.reset()`.
3. Garantir que o `reset` só rode se `formEl` ainda existir (modal pode ter desmontado).

Nenhuma outra mudança de lógica, banco, RLS ou UI é necessária. Após o fix, o toast de sucesso aparece corretamente e o formulário é limpo sem erro.
