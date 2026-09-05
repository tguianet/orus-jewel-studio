import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { studioReducer, createInitialState, type StudioEditorState, type StudioAction } from "./reducer";
import type { StudioPageDocument } from "../types/document";
import { findNode } from "../utils/tree";

type StudioStoreValue = {
  state: StudioEditorState;
  dispatch: Dispatch<StudioAction>;
};

const StudioStoreCtx = createContext<StudioStoreValue | null>(null);

export function StudioStoreProvider({ document, children }: { document: StudioPageDocument; children: ReactNode }) {
  const [state, dispatch] = useReducer(studioReducer, document, createInitialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StudioStoreCtx.Provider value={value}>{children}</StudioStoreCtx.Provider>;
}

export function useStudioStore(): StudioStoreValue {
  const ctx = useContext(StudioStoreCtx);
  if (!ctx) throw new Error("useStudioStore deve ser usado dentro de StudioStoreProvider");
  return ctx;
}

export function useSelectedNode() {
  const { state } = useStudioStore();
  if (!state.selectedId) return null;
  return findNode(state.document.nodes, state.selectedId);
}
