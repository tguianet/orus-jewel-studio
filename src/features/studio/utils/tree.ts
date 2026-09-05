import type { StudioNode } from "../types/document";

export function generateNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneNodeDeep(node: StudioNode): StudioNode {
  return {
    ...node,
    id: generateNodeId(),
    props: { ...node.props },
    styles: {
      desktop: { ...(node.styles.desktop || {}) },
      tablet: node.styles.tablet ? { ...node.styles.tablet } : undefined,
      mobile: node.styles.mobile ? { ...node.styles.mobile } : undefined,
    },
    children: node.children?.map(cloneNodeDeep),
  };
}

export function walkTree(nodes: StudioNode[], visit: (node: StudioNode, parent: StudioNode | null) => void, parent: StudioNode | null = null) {
  for (const node of nodes) {
    visit(node, parent);
    if (node.children?.length) walkTree(node.children, visit, node);
  }
}

export function findNode(nodes: StudioNode[], id: string): StudioNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(nodes: StudioNode[], childId: string, parent: StudioNode | null = null): { parent: StudioNode | null; index: number; siblings: StudioNode[] } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === childId) {
      return { parent, index: i, siblings: nodes };
    }
    if (nodes[i].children?.length) {
      const found = findParent(nodes[i].children!, childId, nodes[i]);
      if (found) return found;
    }
  }
  return null;
}

/** Retorna nova árvore (imutável) com o nó inserido em parentId (ou raiz se null) no índice dado. */
export function insertNode(nodes: StudioNode[], parentId: string | null, index: number, newNode: StudioNode): StudioNode[] {
  if (parentId === null) {
    const next = [...nodes];
    next.splice(index, 0, newNode);
    return next;
  }
  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = [...(node.children || [])];
      children.splice(index, 0, newNode);
      return { ...node, children };
    }
    if (node.children?.length) {
      return { ...node, children: insertNode(node.children, parentId, index, newNode) };
    }
    return node;
  });
}

export function removeNode(nodes: StudioNode[], nodeId: string): { nodes: StudioNode[]; removed: StudioNode | null } {
  let removed: StudioNode | null = null;
  const filterLevel = (level: StudioNode[]): StudioNode[] =>
    level
      .filter((node) => {
        if (node.id === nodeId) {
          removed = node;
          return false;
        }
        return true;
      })
      .map((node) => (node.children?.length ? { ...node, children: filterLevel(node.children) } : node));
  const next = filterLevel(nodes);
  return { nodes: next, removed };
}

export function updateNode(nodes: StudioNode[], nodeId: string, updater: (node: StudioNode) => StudioNode): StudioNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) return updater(node);
    if (node.children?.length) return { ...node, children: updateNode(node.children, nodeId, updater) };
    return node;
  });
}

export function moveNode(
  nodes: StudioNode[],
  nodeId: string,
  toParentId: string | null,
  toIndex: number,
): StudioNode[] {
  const { nodes: withoutNode, removed } = removeNode(nodes, nodeId);
  if (!removed) return nodes;
  return insertNode(withoutNode, toParentId, toIndex, removed);
}

/** Sobe na árvore até achar o ancestral de nível raiz que contém `id` (ou o próprio `id` se já for raiz). */
export function findRootAncestorId(nodes: StudioNode[], id: string): string | null {
  if (nodes.some((n) => n.id === id)) return id;
  const info = findParent(nodes, id);
  if (!info?.parent) return null;
  let current = info.parent;
  for (;;) {
    const parentInfo = findParent(nodes, current.id);
    if (!parentInfo?.parent) return current.id;
    current = parentInfo.parent;
  }
}

export function countDescendants(node: StudioNode): number {
  let count = 0;
  if (node.children?.length) {
    count += node.children.length;
    for (const child of node.children) count += countDescendants(child);
  }
  return count;
}
