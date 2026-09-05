import type { StudioNodeDefinition } from "../types";
import type { CloudStoreProduct } from "@/lib/cloudStore";
import { StoreProductCard } from "@/components/store/templates/shared/StoreProductCard";
import { WhatsAppFab } from "@/components/store/templates/shared/WhatsAppFab";
import { InlineEditable } from "../InlineEditable";

type ProductSourceProps = {
  source?: "all" | "collection" | "category";
  collection?: string;
  category?: string;
  limit?: number;
  order?: "default" | "name_asc" | "price_asc" | "price_desc";
  showPrice?: boolean;
  showButton?: boolean;
  showName?: boolean;
  showDiscount?: boolean;
  cardStyle?: "default" | "compact" | "large";
};

function pickProducts(all: CloudStoreProduct[], props: ProductSourceProps): CloudStoreProduct[] {
  let list = all;
  if (props.source === "category" && props.category) {
    list = list.filter((p) => p.category === props.category);
  }
  if (props.order === "name_asc") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (props.order === "price_asc") list = [...list].sort((a, b) => a.resellerPrice - b.resellerPrice);
  if (props.order === "price_desc") list = [...list].sort((a, b) => b.resellerPrice - a.resellerPrice);
  const limit = props.limit && props.limit > 0 ? props.limit : 8;
  return list.slice(0, limit);
}

const orderField = {
  key: "order",
  label: "Ordenação",
  type: "select" as const,
  options: [
    { label: "Padrão", value: "default" },
    { label: "Nome (A-Z)", value: "name_asc" },
    { label: "Menor preço", value: "price_asc" },
    { label: "Maior preço", value: "price_desc" },
  ],
};

const cardStyleField = {
  key: "cardStyle",
  label: "Estilo do card",
  type: "select" as const,
  options: [
    { label: "Padrão", value: "default" },
    { label: "Compacto", value: "compact" },
    { label: "Grande", value: "large" },
  ],
};

const displayFields = [
  { key: "showName", label: "Mostrar nome", type: "boolean" as const },
  { key: "showPrice", label: "Mostrar preço", type: "boolean" as const },
  { key: "showButton", label: "Mostrar botão", type: "boolean" as const },
  { key: "showDiscount", label: "Mostrar desconto", type: "boolean" as const },
];

export const productGridDef: StudioNodeDefinition = {
  type: "productGrid",
  label: "Grade de produtos",
  category: "product",
  icon: "Grid3x3",
  allowChildren: false,
  defaultProps: { source: "all", limit: 8, order: "default", showPrice: true, showButton: false, showName: true, cardStyle: "default" } as ProductSourceProps,
  defaultStyles: { desktop: { display: "grid", columns: 4, gap: "24px" }, tablet: { columns: 3 }, mobile: { columns: 2 } },
  contentFields: [
    { key: "limit", label: "Quantidade", type: "number" },
    {
      key: "source",
      label: "Origem",
      type: "select",
      options: [
        { label: "Todos os produtos", value: "all" },
        { label: "Categoria específica", value: "category" },
      ],
    },
    { key: "category", label: "Categoria", type: "select", options: [] },
    orderField,
    cardStyleField,
    ...displayFields,
  ],
  render: ({ node, data, style, rootProps }) => {
    const props = node.props as ProductSourceProps;
    const list = pickProducts(data.products, props);
    if (!list.length) {
      return (
        <div {...rootProps} style={style}>
          <p className="col-span-full text-center text-sm text-muted-foreground py-8">Nenhum produto disponível ainda.</p>
        </div>
      );
    }
    return (
      <div {...rootProps} style={style}>
        {list.map((p) => (
          <StoreProductCard key={p.id} product={p} storeSlug={data.storeSlug} density={props.cardStyle === "large" ? "large" : props.cardStyle === "compact" ? "compact" : "default"} showHeart={false} forceMobile />
        ))}
      </div>
    );
  },
};

export const featuredProductsDef: StudioNodeDefinition = {
  ...productGridDef,
  type: "featuredProducts",
  label: "Produtos em destaque",
  icon: "Star",
  defaultProps: { ...productGridDef.defaultProps, limit: 4 },
};

export const productCarouselDef: StudioNodeDefinition = {
  type: "productCarousel",
  label: "Carrossel de produtos",
  category: "product",
  icon: "GalleryHorizontalEnd",
  allowChildren: false,
  defaultProps: { source: "all", limit: 10, order: "default", showPrice: true, showButton: false, showName: true, cardStyle: "compact" } as ProductSourceProps,
  defaultStyles: { desktop: { display: "flex", gap: "16px" } },
  contentFields: [
    { key: "limit", label: "Quantidade", type: "number" },
    orderField,
    cardStyleField,
    ...displayFields,
  ],
  render: ({ node, data, style, rootProps }) => {
    const props = node.props as ProductSourceProps;
    const list = pickProducts(data.products, props);
    if (!list.length) {
      return (
        <div {...rootProps} style={style}>
          <p className="text-sm text-muted-foreground py-8">Nenhum produto disponível ainda.</p>
        </div>
      );
    }
    return (
      <div {...rootProps} style={style} className="overflow-x-auto w-full pb-2 snap-x">
        {list.map((p) => (
          <div key={p.id} className="shrink-0 w-40 snap-start">
            <StoreProductCard product={p} storeSlug={data.storeSlug} density="compact" showHeart={false} forceMobile />
          </div>
        ))}
      </div>
    );
  },
};

export const productCardDef: StudioNodeDefinition = {
  type: "productCard",
  label: "Card de produto",
  category: "product",
  icon: "SquareStack",
  allowChildren: false,
  defaultProps: { productId: "" },
  defaultStyles: { desktop: { width: "280px" } },
  contentFields: [{ key: "productId", label: "Produto", type: "select", options: [] }],
  render: ({ node, data, style, rootProps }) => {
    const productId = node.props.productId as string;
    const product = data.products.find((p) => p.id === productId) || data.products[0];
    return (
      <div {...rootProps} style={style}>
        {product ? (
          <StoreProductCard product={product} storeSlug={data.storeSlug} showHeart={false} forceMobile />
        ) : (
          <p className="text-sm text-muted-foreground">Cadastre produtos para usar este bloco.</p>
        )}
      </div>
    );
  },
};

export const categorySectionDef: StudioNodeDefinition = {
  type: "categorySection",
  label: "Categorias em destaque",
  category: "product",
  icon: "LayoutGrid",
  allowChildren: false,
  defaultProps: { limit: 6 },
  defaultStyles: { desktop: { display: "grid", columns: 6, gap: "24px" }, tablet: { columns: 4 }, mobile: { columns: 2 } },
  contentFields: [{ key: "limit", label: "Quantidade de categorias", type: "number" }],
  render: ({ node, data, style, rootProps }) => {
    const limit = (node.props.limit as number) || 6;
    const collections = data.collections.slice(0, limit);
    if (!collections.length) {
      return (
        <div {...rootProps} style={style}>
          <p className="col-span-full text-center text-sm text-muted-foreground py-8">Cadastre categorias de produtos para exibi-las aqui.</p>
        </div>
      );
    }
    return (
      <div {...rootProps} style={style}>
        {collections.map((c) => {
          const sample = data.products.find((p) => p.category === c);
          return (
            <div key={c} className="flex flex-col items-center text-center gap-3">
              <div className="aspect-square w-full overflow-hidden rounded-full bg-secondary/40 ring-1 ring-border">
                {sample?.image && <img src={sample.image} alt={c} className="w-full h-full object-cover" />}
              </div>
              <h3 className="text-[11px] uppercase tracking-[0.3em] font-light">{c}</h3>
            </div>
          );
        })}
      </div>
    );
  },
};

export const promotionalCollectionDef: StudioNodeDefinition = {
  type: "promotionalCollection",
  label: "Coleção promocional",
  category: "product",
  icon: "BadgePercent",
  allowChildren: false,
  defaultProps: { title: "Nova coleção", subtitle: "Confira as novidades", category: "", buttonText: "Ver coleção", image: "" },
  defaultStyles: {
    desktop: { display: "flex", flexDirection: "row", gap: "32px", alignItems: "center", padding: "40px", borderRadius: "16px", background: "hsl(var(--secondary))" },
    mobile: { flexDirection: "column" },
  },
  contentFields: [
    { key: "title", label: "Título", type: "text" },
    { key: "subtitle", label: "Subtítulo", type: "text" },
    { key: "category", label: "Categoria vinculada", type: "select", options: [] },
    { key: "buttonText", label: "Texto do botão", type: "text" },
    { key: "image", label: "Imagem", type: "image" },
  ],
  render: ({ node, editing, onPropChange, style, rootProps }) => {
    const image = (node.props.image as string) || "";
    return (
      <div {...rootProps} style={style}>
        <div className="flex-1 aspect-video rounded-xl overflow-hidden bg-muted min-w-0">
          {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">Sem imagem</div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <InlineEditable as="h3" className="font-display text-2xl font-light block" value={(node.props.title as string) || ""} editing={editing} onCommit={(v) => onPropChange?.("title", v)} />
          <InlineEditable as="p" className="text-muted-foreground block" value={(node.props.subtitle as string) || ""} editing={editing} onCommit={(v) => onPropChange?.("subtitle", v)} />
          <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-[11px] uppercase tracking-[0.2em] w-fit">
            <InlineEditable as="span" value={(node.props.buttonText as string) || ""} editing={editing} onCommit={(v) => onPropChange?.("buttonText", v)} />
          </span>
        </div>
      </div>
    );
  },
};

export const whatsappDef: StudioNodeDefinition = {
  type: "whatsapp",
  label: "Botão WhatsApp",
  category: "action",
  icon: "MessageCircle",
  allowChildren: false,
  defaultProps: { phone: "", large: false },
  defaultStyles: { desktop: {} },
  contentFields: [{ key: "phone", label: "Telefone (com DDI)", type: "text" }],
  render: ({ node, data, style, rootProps }) => (
    <div {...rootProps} style={style}>
      <WhatsAppFab phone={(node.props.phone as string) || undefined} storeName={data.store.storeName} large={!!node.props.large} />
    </div>
  ),
};
