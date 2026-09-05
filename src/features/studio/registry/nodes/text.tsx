import type { ElementType } from "react";
import type { StudioNodeDefinition } from "../types";
import { InlineEditable } from "../InlineEditable";

export const headingDef: StudioNodeDefinition = {
  type: "heading",
  label: "Título",
  category: "text",
  icon: "Heading",
  allowChildren: false,
  defaultProps: { text: "Novo título", level: "h2" },
  defaultStyles: {
    desktop: { fontSize: "32px", fontWeight: "300", lineHeight: "1.15" },
    mobile: { fontSize: "24px" },
  },
  contentFields: [
    { key: "text", label: "Texto", type: "text" },
    {
      key: "level",
      label: "Nível",
      type: "select",
      options: [
        { label: "H1", value: "h1" },
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
      ],
    },
  ],
  render: ({ node, editing, onPropChange, style, rootProps }) => (
    <InlineEditable
      as={((node.props.level as string) || "h2") as ElementType}
      value={(node.props.text as string) || ""}
      editing={editing}
      onCommit={(v) => onPropChange?.("text", v)}
      className="font-display block"
      style={style}
      rootProps={rootProps}
    />
  ),
};

export const textDef: StudioNodeDefinition = {
  type: "text",
  label: "Texto",
  category: "text",
  icon: "Type",
  allowChildren: false,
  defaultProps: { text: "Escreva um texto aqui." },
  defaultStyles: { desktop: { fontSize: "16px", lineHeight: "1.6" } },
  contentFields: [{ key: "text", label: "Conteúdo", type: "richtext" }],
  render: ({ node, editing, onPropChange, style, rootProps }) => (
    <InlineEditable
      as="p"
      value={(node.props.text as string) || ""}
      editing={editing}
      onCommit={(v) => onPropChange?.("text", v)}
      className="block whitespace-pre-line"
      style={style}
      rootProps={rootProps}
    />
  ),
};

export const buttonDef: StudioNodeDefinition = {
  type: "button",
  label: "Botão",
  category: "action",
  icon: "MousePointerClick",
  allowChildren: false,
  defaultProps: { text: "Saiba mais", href: "#", target: "_self" },
  defaultStyles: {
    desktop: {
      display: "flex",
      padding: "14px 32px",
      borderRadius: "999px",
      background: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
    },
  },
  contentFields: [
    { key: "text", label: "Texto do botão", type: "text" },
    { key: "href", label: "Link", type: "link" },
    {
      key: "target",
      label: "Abrir em",
      type: "select",
      options: [
        { label: "Mesma aba", value: "_self" },
        { label: "Nova aba", value: "_blank" },
      ],
    },
  ],
  render: ({ node, editing, onPropChange, style, rootProps }) => (
    <a
      {...rootProps}
      href={editing ? undefined : (node.props.href as string) || "#"}
      target={(node.props.target as string) || "_self"}
      onClick={(e) => {
        if (editing) e.preventDefault();
        rootProps.onClick?.(e as never);
      }}
      style={style}
      className="inline-flex items-center justify-center gap-2 w-fit"
    >
      <InlineEditable
        as="span"
        value={(node.props.text as string) || ""}
        editing={editing}
        onCommit={(v) => onPropChange?.("text", v)}
      />
    </a>
  ),
};
