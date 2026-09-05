import type { StudioNodeDefinition } from "../types";

export const sectionDef: StudioNodeDefinition = {
  type: "section",
  label: "Seção",
  category: "layout",
  icon: "Rows3",
  allowChildren: true,
  defaultProps: {},
  defaultStyles: { desktop: { padding: "64px 0", background: "transparent" } },
  contentFields: [],
  render: ({ renderChildren, node, style, rootProps }) => (
    <section {...rootProps} style={style} data-studio-node-type="section" data-studio-node-name={node.name}>
      {renderChildren()}
    </section>
  ),
};

export const containerDef: StudioNodeDefinition = {
  type: "container",
  label: "Container",
  category: "layout",
  icon: "Square",
  allowChildren: true,
  defaultProps: {},
  defaultStyles: { desktop: { maxWidth: "1200px", margin: "0 auto", padding: "0 24px", width: "100%" } },
  contentFields: [],
  render: ({ renderChildren, style, rootProps }) => (
    <div {...rootProps} style={style}>
      {renderChildren()}
    </div>
  ),
};

export const flexDef: StudioNodeDefinition = {
  type: "flex",
  label: "Colunas (Flex)",
  category: "layout",
  icon: "Columns3",
  allowChildren: true,
  defaultProps: {},
  defaultStyles: {
    desktop: { display: "flex", flexDirection: "row", gap: "24px", alignItems: "stretch" },
    mobile: { flexDirection: "column" },
  },
  contentFields: [],
  render: ({ renderChildren, style, rootProps }) => (
    <div {...rootProps} style={style}>
      {renderChildren()}
    </div>
  ),
};

export const gridDef: StudioNodeDefinition = {
  type: "grid",
  label: "Grid",
  category: "layout",
  icon: "LayoutGrid",
  allowChildren: true,
  defaultProps: {},
  defaultStyles: {
    desktop: { display: "grid", columns: 4, gap: "24px" },
    tablet: { columns: 3 },
    mobile: { columns: 2 },
  },
  contentFields: [],
  render: ({ renderChildren, style, rootProps }) => (
    <div {...rootProps} style={style}>
      {renderChildren()}
    </div>
  ),
};

export const cardDef: StudioNodeDefinition = {
  type: "card",
  label: "Card",
  category: "layout",
  icon: "IdCard",
  allowChildren: true,
  defaultProps: {},
  defaultStyles: {
    desktop: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "24px",
      borderRadius: "16px",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "hsl(var(--border))",
      background: "hsl(var(--card))",
    },
  },
  contentFields: [],
  render: ({ renderChildren, style, rootProps }) => (
    <div {...rootProps} style={style}>
      {renderChildren()}
    </div>
  ),
};

export const spacerDef: StudioNodeDefinition = {
  type: "spacer",
  label: "Espaçador",
  category: "layout",
  icon: "MoveVertical",
  allowChildren: false,
  defaultProps: {},
  defaultStyles: { desktop: { height: "40px" } },
  contentFields: [
    { key: "note", label: "Altura em px no painel Layout", type: "text" },
  ],
  render: ({ style, rootProps }) => <div {...rootProps} style={style} />,
};

export const dividerDef: StudioNodeDefinition = {
  type: "divider",
  label: "Divisor",
  category: "layout",
  icon: "Minus",
  allowChildren: false,
  defaultProps: {},
  defaultStyles: {
    desktop: { height: "1px", background: "hsl(var(--border))", margin: "24px 0", width: "100%" },
  },
  contentFields: [],
  render: ({ style, rootProps }) => <hr {...rootProps} className="border-0" style={style} />,
};
