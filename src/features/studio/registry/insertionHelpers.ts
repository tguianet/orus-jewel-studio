import type { Dispatch } from "react";
import type { StudioAction, StudioEditorState } from "../store/reducer";
import type { StudioNode } from "../types/document";
import { findNode, findParent, findRootAncestorId } from "../utils/tree";
import { getNodeDefinition } from "./index";
import { createNode } from "./createNode";

/** Insere um elemento relativo à seleção atual: dentro do selecionado se ele aceitar filhos,
 * senão como irmão logo após ele. Sem seleção, insere no final da raiz. */
export function addElementNode(dispatch: Dispatch<StudioAction>, state: StudioEditorState, type: string) {
  const node = createNode(type);
  const selected = state.selectedId ? findNode(state.document.nodes, state.selectedId) : null;

  if (!selected) {
    dispatch({ type: "ADD_NODE", parentId: null, index: state.document.nodes.length, node });
    return;
  }

  const selectedDef = getNodeDefinition(selected.type);
  if (selectedDef.allowChildren) {
    dispatch({ type: "ADD_NODE", parentId: selected.id, index: selected.children?.length || 0, node });
    return;
  }

  const info = findParent(state.document.nodes, selected.id);
  dispatch({ type: "ADD_NODE", parentId: info?.parent?.id ?? null, index: (info?.index ?? -1) + 1, node });
}

/** Insere uma seção pronta sempre no nível raiz, logo após a seção atualmente selecionada (ou no final). */
export function addSectionAtRoot(dispatch: Dispatch<StudioAction>, state: StudioEditorState, node: StudioNode) {
  let index = state.document.nodes.length;
  if (state.selectedId) {
    const rootId = findRootAncestorId(state.document.nodes, state.selectedId);
    if (rootId) {
      const i = state.document.nodes.findIndex((n) => n.id === rootId);
      if (i >= 0) index = i + 1;
    }
  }
  dispatch({ type: "ADD_NODE", parentId: null, index, node });
}
