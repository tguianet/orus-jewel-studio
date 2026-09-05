import type { StoreTheme } from "@/lib/storeTheme";
import type { Sacoleira } from "@/types/commerce";
import type { StudioNode } from "../types/document";
import { createNode } from "../registry/createNode";

export type LegacyAdapterInput = {
  store: Pick<Sacoleira, "storeName" | "storeSlug" | "phone">;
  theme: StoreTheme;
};

/**
 * Converte a loja legada (StoreTheme em campos soltos, estilo EleganceHome) num documento
 * inicial do Studio V2, para que lojas existentes nunca abram em branco.
 */
export function convertLegacyThemeToStudioDocument({ store, theme }: LegacyAdapterInput): StudioNode[] {
  const nodes: StudioNode[] = [];

  // Hero
  nodes.push(
    createNode("section", {
      name: "Seção: Hero",
      styles: { desktop: { padding: "96px 0", minHeight: "480px", display: "flex", alignItems: "center" } },
      children: [
        createNode("container", {
          children: [
            createNode("text", {
              name: "Eyebrow",
              props: { text: theme.heroEyebrow || "Nova coleção" },
              styles: { desktop: { fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase" } },
            }),
            createNode("heading", {
              name: "Título do Hero",
              props: { text: theme.heroTitle1 || store.storeName, level: "h1" },
              styles: { desktop: { fontSize: "56px" } },
            }),
            ...(theme.heroTitleHighlight
              ? [createNode("heading", { name: "Subtítulo", props: { text: theme.heroTitleHighlight, level: "h3" } })]
              : []),
            ...(theme.heroPromoText ? [createNode("text", { name: "Texto promocional", props: { text: theme.heroPromoText } })] : []),
            createNode("flex", {
              name: "Botões do Hero",
              styles: { desktop: { gap: "12px" } },
              children: [
                createNode("button", { name: "Botão primário", props: { text: theme.heroCtaPrimary || "Descobrir coleção", href: "#vitrine" } }),
                ...(theme.heroCtaSecondary
                  ? [createNode("button", { name: "Botão secundário", props: { text: theme.heroCtaSecondary, href: "#sobre" } })]
                  : []),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // Benefícios
  if (theme.showCollections !== false) {
    const benefits = theme.benefits?.length
      ? theme.benefits
      : ["Frete Grátis*", "Parcele em até 10x sem juros", "Bônus em todas as compras*", "5% OFF com PIX", "Atendimento personalizado"];
    nodes.push(
      createNode("section", {
        name: "Seção: Benefícios",
        styles: { desktop: { padding: "24px 0" } },
        children: [
          createNode("flex", {
            styles: { desktop: { justifyContent: "center", gap: "40px", flexWrap: "wrap" } },
            children: benefits.map((b) =>
              createNode("text", { props: { text: b }, styles: { desktop: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em" } } }),
            ),
          }),
        ],
      }),
    );
  }

  // Coleções / categorias
  if (theme.showCollections !== false) {
    nodes.push(
      createNode("section", {
        name: "Seção: Coleções",
        children: [
          createNode("container", {
            children: [
              createNode("heading", {
                name: "Título",
                props: { text: theme.categoriesTitle || `Joias ${store.storeName}`, level: "h2" },
                styles: { desktop: { textAlign: "center" } },
              }),
              createNode("text", {
                name: "Subtítulo",
                props: { text: theme.categoriesSubtitle || "Escolha por categorias" },
                styles: { desktop: { textAlign: "center", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.2em" } },
              }),
              createNode("categorySection", { name: "Categorias", props: { limit: 6 } }),
            ],
          }),
        ],
      }),
    );
  }

  // Vitrine de produtos
  nodes.push(
    createNode("section", {
      name: "Seção: Vitrine",
      children: [
        createNode("container", {
          children: [
            createNode("heading", { name: "Título", props: { text: "Selecionadas para você", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
            createNode("productGrid", { name: "Vitrine", props: { source: "all", limit: 8 } }),
          ],
        }),
      ],
    }),
  );

  // Sobre
  if (theme.aboutText || theme.description || true) {
    nodes.push(
      createNode("section", {
        name: "Seção: Sobre a loja",
        children: [
          createNode("container", {
            children: [
              createNode("text", { name: "Eyebrow", props: { text: theme.aboutEyebrow || "Sobre a loja" } }),
              createNode("heading", { name: "Título", props: { text: theme.aboutTitle || store.storeName, level: "h2" } }),
              createNode("text", {
                name: "Texto",
                props: {
                  text:
                    theme.aboutText ||
                    theme.description ||
                    `${store.storeName} é uma curadoria autoral de joias em prata 925, ouro 18k e folheados a ouro de alta qualidade.`,
                },
              }),
            ],
          }),
        ],
      }),
    );
  }

  // CTA final
  if (theme.showFinalCta !== false) {
    nodes.push(
      createNode("section", {
        name: "Seção: CTA final",
        children: [
          createNode("container", {
            children: [
              createNode("heading", {
                name: "Título",
                props: { text: theme.finalCtaTitle || "Não encontrou o que procurava? Fale comigo.", level: "h2" },
                styles: { desktop: { textAlign: "center" } },
              }),
              createNode("flex", {
                styles: { desktop: { justifyContent: "center" } },
                children: [createNode("whatsapp", { name: "Botão WhatsApp", props: { phone: theme.whatsapp || store.phone || "", large: true } })],
              }),
            ],
          }),
        ],
      }),
    );
  }

  return nodes;
}
