import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import type { StudioNode, Breakpoint } from "../types/document";
import { getNodeDefinition } from "./index";
import { resolveEffectiveStyle, styleToCss } from "../utils/style";
import type { StudioDataContext as StudioDataShape } from "./types";

const DataCtx = createContext<StudioDataShape | null>(null);

export function StudioDataProvider({ value, children }: { value: StudioDataShape; children: ReactNode }) {
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useStudioData(): StudioDataShape {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useStudioData deve ser usado dentro de StudioDataProvider");
  return ctx;
}

export type StudioTreeInteraction = {
  /** true = canvas do Studio (seleção/hover/edição inline ativos); false = render público/preview limpo. */
  editing: boolean;
  breakpoint: Breakpoint;
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  onPropChange?: (nodeId: string, field: string, value: unknown) => void;
};

export function StudioTree({ nodes, ...interaction }: { nodes: StudioNode[] } & StudioTreeInteraction) {
  return (
    <>
      {nodes.map((node) => (
        <StudioNodeView key={node.id} node={node} {...interaction} />
      ))}
    </>
  );
}

function StudioNodeView({ node, ...interaction }: { node: StudioNode } & StudioTreeInteraction) {
  const data = useStudioData();
  const { editing, breakpoint, selectedId, hoveredId, onSelect, onHover, onPropChange } = interaction;

  if (node.hidden && !editing) return null;

  const def = getNodeDefinition(node.type);
  const style = styleToCss(resolveEffectiveStyle(node.styles, breakpoint));

  if (editing) {
    const isSelected = selectedId === node.id;
    const isHovered = hoveredId === node.id && !isSelected;
    if (node.hidden) style.opacity = 0.35;
    if (isSelected) {
      style.outline = "2px solid hsl(var(--primary))";
      style.outlineOffset = "-1px";
    } else if (isHovered) {
      style.outline = "1px dashed hsl(var(--primary) / 0.6)";
      style.outlineOffset = "-1px";
    }
  }

  const rootProps: HTMLAttributes<HTMLElement> & { [key: `data-${string}`]: string } = editing
    ? {
        "data-studio-id": node.id,
        onClick: (e) => {
          e.stopPropagation();
          onSelect?.(node.id);
        },
        onMouseEnter: (e) => {
          e.stopPropagation();
          onHover?.(node.id);
        },
        onMouseLeave: (e) => {
          e.stopPropagation();
          onHover?.(null);
        },
      }
    : {};

  const Comp = def.render;
  return (
    <Comp
      node={node}
      data={data}
      editing={editing}
      style={style}
      rootProps={rootProps}
      renderChildren={() => <StudioTree nodes={node.children || []} {...interaction} />}
      onPropChange={(field, value) => onPropChange?.(node.id, field, value)}
    />
  );
}
