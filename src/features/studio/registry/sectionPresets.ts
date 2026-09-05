import type { StudioNode } from "../types/document";
import { createNode } from "./createNode";

export type SectionPresetKey =
  | "hero"
  | "banner"
  | "featuredProducts"
  | "collections"
  | "about"
  | "benefits"
  | "testimonials"
  | "gallery"
  | "cta"
  | "whatsapp"
  | "instagram"
  | "footer";

export type SectionPresetMeta = { key: SectionPresetKey; label: string; description: string; icon: string };

export const SECTION_PRESETS: SectionPresetMeta[] = [
  { key: "hero", label: "Hero", description: "Banner principal com título e chamada", icon: "GalleryHorizontal" },
  { key: "banner", label: "Banner", description: "Imagem de destaque em largura total", icon: "Image" },
  { key: "featuredProducts", label: "Produtos em destaque", description: "Vitrine com os produtos da loja", icon: "Star" },
  { key: "collections", label: "Coleções", description: "Categorias em destaque", icon: "LayoutGrid" },
  { key: "about", label: "Sobre a loja", description: "Texto institucional + destaques", icon: "BookOpen" },
  { key: "benefits", label: "Benefícios", description: "Faixa com diferenciais da loja", icon: "BadgeCheck" },
  { key: "testimonials", label: "Depoimentos", description: "Avaliações de clientes", icon: "MessageSquareQuote" },
  { key: "gallery", label: "Galeria", description: "Grade de imagens", icon: "GalleryHorizontal" },
  { key: "cta", label: "CTA", description: "Chamada final para ação", icon: "Megaphone" },
  { key: "whatsapp", label: "WhatsApp", description: "Botão flutuante de contato", icon: "MessageCircle" },
  { key: "instagram", label: "Instagram", description: "Grade com fotos do Instagram", icon: "Instagram" },
  { key: "footer", label: "Rodapé", description: "Informações finais da loja", icon: "PanelBottom" },
];

function section(name: string, children: StudioNode[], styles?: StudioNode["styles"]): StudioNode {
  return createNode("section", { name, children, styles });
}

function container(children: StudioNode[]): StudioNode {
  return createNode("container", { children });
}

export function buildSectionPreset(key: SectionPresetKey): StudioNode {
  switch (key) {
    case "hero":
      return section("Seção: Hero", [
        container([
          createNode("text", { name: "Eyebrow", props: { text: "Nova coleção" }, styles: { desktop: { fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase" } } }),
          createNode("heading", { name: "Título do Hero", props: { text: "Joias com sua história", level: "h1" }, styles: { desktop: { fontSize: "56px" } } }),
          createNode("text", { name: "Texto promocional", props: { text: "Peças exclusivas escolhidas para você." } }),
          createNode("button", { name: "Botão do Hero", props: { text: "Descobrir coleção", href: "#vitrine" } }),
        ]),
      ], { desktop: { padding: "96px 0", minHeight: "480px", display: "flex", alignItems: "center" } });

    case "banner":
      return section("Seção: Banner", [
        createNode("image", { name: "Banner", styles: { desktop: { width: "100%", height: "360px" } } }),
      ], { desktop: { padding: "0" } });

    case "featuredProducts":
      return section("Seção: Produtos em destaque", [
        container([
          createNode("heading", { name: "Título", props: { text: "Selecionadas para você", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
          createNode("featuredProducts", { name: "Vitrine" }),
        ]),
      ]);

    case "collections":
      return section("Seção: Coleções", [
        container([
          createNode("heading", { name: "Título", props: { text: "Escolha por categorias", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
          createNode("categorySection", { name: "Categorias" }),
        ]),
      ]);

    case "about":
      return section("Seção: Sobre a loja", [
        container([
          createNode("text", { name: "Eyebrow", props: { text: "Sobre a loja" } }),
          createNode("heading", { name: "Título", props: { text: "Nossa história", level: "h2" } }),
          createNode("text", { name: "Texto", props: { text: "Conte a história da sua loja, os materiais que você usa e o que torna suas peças especiais." } }),
        ]),
      ]);

    case "benefits":
      return section("Seção: Benefícios", [
        createNode("flex", {
          name: "Lista de benefícios",
          styles: { desktop: { justifyContent: "center", gap: "40px", flexWrap: "wrap" } },
          children: ["Frete grátis*", "Parcele em até 10x", "Bônus em todas as compras*", "Atendimento personalizado"].map((t) =>
            createNode("text", { props: { text: t }, styles: { desktop: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em" } } }),
          ),
        }),
      ], { desktop: { padding: "24px 0" } });

    case "testimonials":
      return section("Seção: Depoimentos", [
        container([
          createNode("heading", { name: "Título", props: { text: "O que dizem sobre nós", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
          createNode("grid", {
            name: "Depoimentos",
            styles: { desktop: { columns: 3, gap: "24px" }, mobile: { columns: 1 } },
            children: [1, 2, 3].map((i) =>
              createNode("card", {
                children: [
                  createNode("text", { props: { text: "“Adorei minha compra, chegou rápido e a peça é ainda mais linda pessoalmente.”" } }),
                  createNode("text", { props: { text: `Cliente ${i}` }, styles: { desktop: { fontSize: "12px", fontWeight: "600" } } }),
                ],
              }),
            ),
          }),
        ]),
      ]);

    case "gallery":
      return section("Seção: Galeria", [
        container([
          createNode("heading", { name: "Título", props: { text: "Galeria", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
          createNode("gallery", { name: "Imagens" }),
        ]),
      ]);

    case "cta":
      return section("Seção: CTA final", [
        container([
          createNode("heading", { name: "Título", props: { text: "Não encontrou o que procurava? Fale com a gente.", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
          createNode("flex", { styles: { desktop: { justifyContent: "center" } }, children: [createNode("whatsapp", { name: "Botão WhatsApp", props: { large: true } })] }),
        ]),
      ]);

    case "whatsapp":
      return section("Seção: WhatsApp flutuante", [createNode("whatsapp", { name: "WhatsApp" })], { desktop: { padding: "0" } });

    case "instagram":
      return section("Seção: Instagram", [
        container([
          createNode("heading", { name: "Título", props: { text: "Siga no Instagram", level: "h2" }, styles: { desktop: { textAlign: "center" } } }),
          createNode("gallery", { name: "Feed" }),
        ]),
      ]);

    case "footer":
      return section("Seção: Rodapé", [
        container([
          createNode("text", { name: "Texto do rodapé", props: { text: "Loja virtual de joias exclusivas." }, styles: { desktop: { textAlign: "center" } } }),
        ]),
      ], { desktop: { padding: "48px 0", borderWidth: "1px", borderStyle: "solid", borderColor: "hsl(var(--border))" } });

    default:
      return section("Nova seção", []);
  }
}
