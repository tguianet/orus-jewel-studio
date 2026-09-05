import type { Breakpoint, StudioNode, StudioPageDocument, StudioStyle, SaveStatus } from "../types/document";
import { insertNode, removeNode, updateNode, moveNode, findNode, cloneNodeDeep, findParent } from "../utils/tree";
import { mergeStyleAtBreakpoint } from "../utils/style";
import { pushHistory, undo as undoHistory, redo as redoHistory, type HistoryState } from "../history/undoRedo";

export type StudioEditorState = {
  document: StudioPageDocument;
  selectedId: string | null;
  hoveredId: string | null;
  breakpoint: Breakpoint;
  history: HistoryState;
  dirty: boolean;
  saveStatus: SaveStatus;
};

export type StudioAction =
  | { type: "LOAD_DOCUMENT"; document: StudioPageDocument }
  | { type: "SELECT"; id: string | null }
  | { type: "HOVER"; id: string | null }
  | { type: "SET_BREAKPOINT"; breakpoint: Breakpoint }
  | { type: "ADD_NODE"; parentId: string | null; index: number; node: StudioNode }
  | { type: "REMOVE_NODE"; nodeId: string }
  | { type: "DUPLICATE_NODE"; nodeId: string }
  | { type: "MOVE_NODE"; nodeId: string; toParentId: string | null; toIndex: number }
  | { type: "UPDATE_PROPS"; nodeId: string; patch: Record<string, unknown> }
  | { type: "UPDATE_STYLE"; nodeId: string; breakpoint: Breakpoint; patch: StudioStyle }
  | { type: "TOGGLE_HIDDEN"; nodeId: string }
  | { type: "TOGGLE_LOCKED"; nodeId: string }
  | { type: "RENAME_NODE"; nodeId: string; name: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_SAVE_STATUS"; status: SaveStatus }
  | { type: "MARK_SAVED"; version?: number };

function withNodes(state: StudioEditorState, nodes: StudioNode[], recordHistory = true): StudioEditorState {
  return {
    ...state,
    document: { ...state.document, nodes },
    history: recordHistory ? pushHistory(state.history, state.document.nodes) : state.history,
    dirty: true,
    saveStatus: "unsaved",
  };
}

export function studioReducer(state: StudioEditorState, action: StudioAction): StudioEditorState {
  switch (action.type) {
    case "LOAD_DOCUMENT":
      return {
        ...state,
        document: action.document,
        selectedId: null,
        hoveredId: null,
        history: { past: [], future: [] },
        dirty: false,
        saveStatus: "idle",
      };

    case "SELECT":
      return { ...state, selectedId: action.id };

    case "HOVER":
      return { ...state, hoveredId: action.id };

    case "SET_BREAKPOINT":
      return { ...state, breakpoint: action.breakpoint };

    case "ADD_NODE": {
      const nodes = insertNode(state.document.nodes, action.parentId, action.index, action.node);
      return { ...withNodes(state, nodes), selectedId: action.node.id };
    }

    case "REMOVE_NODE": {
      const target = findNode(state.document.nodes, action.nodeId);
      if (target?.locked) return state;
      const { nodes } = removeNode(state.document.nodes, action.nodeId);
      return {
        ...withNodes(state, nodes),
        selectedId: state.selectedId === action.nodeId ? null : state.selectedId,
      };
    }

    case "DUPLICATE_NODE": {
      const target = findNode(state.document.nodes, action.nodeId);
      if (!target) return state;
      const parentInfo = findParent(state.document.nodes, action.nodeId);
      const clone = cloneNodeDeep(target);
      clone.name = target.name ? `${target.name} (cópia)` : clone.name;
      const parentId = parentInfo?.parent?.id ?? null;
      const index = (parentInfo?.index ?? state.document.nodes.length - 1) + 1;
      const nodes = insertNode(state.document.nodes, parentId, index, clone);
      return { ...withNodes(state, nodes), selectedId: clone.id };
    }

    case "MOVE_NODE": {
      const target = findNode(state.document.nodes, action.nodeId);
      if (target?.locked) return state;
      const nodes = moveNode(state.document.nodes, action.nodeId, action.toParentId, action.toIndex);
      return withNodes(state, nodes);
    }

    case "UPDATE_PROPS": {
      const nodes = updateNode(state.document.nodes, action.nodeId, (n) => ({ ...n, props: { ...n.props, ...action.patch } }));
      return withNodes(state, nodes);
    }

    case "UPDATE_STYLE": {
      const nodes = updateNode(state.document.nodes, action.nodeId, (n) => ({
        ...n,
        styles: mergeStyleAtBreakpoint(n.styles, action.breakpoint, action.patch),
      }));
      return withNodes(state, nodes);
    }

    case "TOGGLE_HIDDEN": {
      const nodes = updateNode(state.document.nodes, action.nodeId, (n) => ({ ...n, hidden: !n.hidden }));
      return withNodes(state, nodes);
    }

    case "TOGGLE_LOCKED": {
      const nodes = updateNode(state.document.nodes, action.nodeId, (n) => ({ ...n, locked: !n.locked }));
      return withNodes(state, nodes);
    }

    case "RENAME_NODE": {
      const nodes = updateNode(state.document.nodes, action.nodeId, (n) => ({ ...n, name: action.name }));
      return withNodes(state, nodes);
    }

    case "UNDO": {
      const result = undoHistory(state.history, state.document.nodes);
      if (!result) return state;
      return {
        ...state,
        document: { ...state.document, nodes: result.nodes },
        history: result.history,
        dirty: true,
        saveStatus: "unsaved",
      };
    }

    case "REDO": {
      const result = redoHistory(state.history, state.document.nodes);
      if (!result) return state;
      return {
        ...state,
        document: { ...state.document, nodes: result.nodes },
        history: result.history,
        dirty: true,
        saveStatus: "unsaved",
      };
    }

    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.status };

    case "MARK_SAVED":
      return {
        ...state,
        dirty: false,
        saveStatus: "saved",
        document: action.version !== undefined ? { ...state.document, version: action.version } : state.document,
      };

    default:
      return state;
  }
}

export function createInitialState(document: StudioPageDocument): StudioEditorState {
  return {
    document,
    selectedId: null,
    hoveredId: null,
    breakpoint: "desktop",
    history: { past: [], future: [] },
    dirty: false,
    saveStatus: "idle",
  };
}
