import type { StudioNode } from "../types/document";
import { generateNodeId } from "../utils/tree";
import { getNodeDefinition } from "./index";

export function createNode(
  type: string,
  overrides?: Partial<Pick<StudioNode, "props" | "styles" | "name" | "children">>,
): StudioNode {
  const def = getNodeDefinition(type);
  return {
    id: generateNodeId(),
    type,
    name: overrides?.name || def.label,
    props: { ...def.defaultProps, ...(overrides?.props || {}) },
    styles: {
      desktop: { ...(def.defaultStyles.desktop || {}) },
      ...(overrides?.styles || {}),
    },
    children: overrides?.children,
  };
}
