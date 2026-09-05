import type { ComponentType, CSSProperties, HTMLAttributes } from "react";
import type { StudioNode, StudioStyles } from "../types/document";
import type { CloudStoreProduct } from "@/lib/cloudStore";

export type StudioNodeCategory = "layout" | "text" | "media" | "product" | "section" | "action";

/** Dados reais da loja disponíveis para qualquer renderer do registry. */
export type StudioDataContext = {
  store: { storeName: string; phone?: string | null };
  storeSlug: string;
  products: CloudStoreProduct[];
  collections: string[];
};

export type StudioRenderProps = {
  node: StudioNode;
  data: StudioDataContext;
  editing: boolean;
  /** Renderiza os filhos deste nó (usado por container/section/flex/grid). */
  renderChildren: () => React.ReactNode;
  /** Só em modo de edição: dispara update de uma prop do nó (texto inline, imagem trocada, etc). */
  onPropChange?: (field: string, value: unknown) => void;
  /** Estilo computado (cascata desktop→tablet→mobile já resolvida) — aplique no elemento raiz. */
  style: CSSProperties;
  /** Handlers de seleção/hover do editor — espalhe no elemento raiz retornado pelo render. */
  rootProps: HTMLAttributes<HTMLElement>;
};

export type ContentFieldType =
  | "text"
  | "richtext"
  | "image"
  | "link"
  | "select"
  | "number"
  | "boolean"
  | "color"
  | "list";

export interface ContentField {
  key: string;
  label: string;
  type: ContentFieldType;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface StudioNodeDefinition {
  type: string;
  label: string;
  category: StudioNodeCategory;
  /** nome do ícone lucide-react a ser resolvido pelo consumidor (evita import pesado aqui) */
  icon: string;
  allowChildren: boolean;
  defaultProps: Record<string, unknown>;
  defaultStyles: StudioStyles;
  contentFields: ContentField[];
  render: ComponentType<StudioRenderProps>;
}

export type StudioRegistry = Record<string, StudioNodeDefinition>;
