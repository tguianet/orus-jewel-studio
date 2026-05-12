## Objetivo

Permitir que a sacoleira edite a própria loja **enquanto vê ela**, sem ficar trocando entre Personalização e a loja pública.

## Como vai funcionar

Uma nova tela em `/sacoleira/personalizacao` (ou um botão "Editar minha loja ao vivo" no menu) com layout dividido:

```text
┌──────────────────────┬───────────────────────────────────┐
│  PAINEL DE EDIÇÃO    │        PREVIEW DA LOJA            │
│  (esquerda, ~380px)  │        (direita, ocupa o resto)   │
│                      │                                   │
│  - Identidade        │   [ aqui renderiza a loja real ]  │
│  - Faixa do topo     │                                   │
│  - Hero              │   Tudo que muda no painel         │
│  - Benefícios        │   aparece imediatamente aqui,     │
│  - Categorias        │   sem recarregar.                 │
│  - Sobre / CTA       │                                   │
│  - Cores             │                                   │
│  - Seções visíveis   │                                   │
│                      │                                   │
│  [ Salvar alterações]│                                   │
└──────────────────────┴───────────────────────────────────┘
```

- O preview à direita é a **própria loja** (mesmos componentes de `StoreLayout` + `StoreHome`), só que recebe o tema sendo editado em memória, em vez de buscar do banco.
- Toda alteração no painel atualiza o preview em tempo real (sem salvar).
- Só ao clicar em **Salvar alterações** é que vai pro banco. Tem também botão **Descartar**.
- Botão **Abrir loja real** para ver em outra aba.
- Acesso restrito: só a dona da loja logada (sacoleira) consegue abrir essa tela. Visitantes nunca veem.

## O que pode ser editado pelo painel

Tudo que já existe hoje em Personalização, organizado em seções recolhíveis:

- **Identidade**: nome da loja, logo, descrição, WhatsApp, Instagram
- **Faixa do topo**: texto esquerda, centro, direita
- **Hero**: eyebrow, título, destaque, texto promocional, CTAs, banners
- **Benefícios**: lista (adicionar/remover)
- **Categorias destaque**: título, subtítulo, imagens por categoria
- **Sobre**: eyebrow, título, textos
- **CTA final**: eyebrow e título
- **Cores**: primária, secundária, accent
- **Seções visíveis**: switches para coleções, materiais, cuidados, garantia, CTA final

## Detalhes técnicos

- Nova página `src/pages/seller/SellerLiveEditor.tsx` com layout 2 colunas (painel + iframe-like).
- Refatorar `StoreHome` e `StoreLayout` para aceitar `theme` e `store` por **prop opcional**, caindo no fetch atual quando não vier prop. Assim o preview consegue passar o estado em edição direto, sem ir no Supabase.
- Estado do tema vive na página do editor (`useState<StoreTheme>`) — mesma estrutura já em `src/lib/storeTheme.ts`.
- Salvar usa o `saveStoreCustomization` que já existe.
- Em telas pequenas (<1024px), painel vira drawer/aba acima do preview, já que dividir não cabe.
- Rota: substituir o conteúdo de `/sacoleira/personalizacao` por esse editor (a sacoleira clica no item "Personalização" no menu lateral e já cai no editor com preview).
- A página antiga `SellerCustomization.tsx` pode ser removida ou virar fallback.

## Fora do escopo (pra não inflar)

- Clicar direto num elemento da loja para focar no campo correspondente. Pode vir depois.
- Edição de produtos / categorias dentro do editor (continua nas telas dedicadas).
- Versionamento / histórico de alterações do tema.