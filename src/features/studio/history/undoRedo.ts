import type { StudioNode } from "../types/document";

export const MAX_HISTORY = 50;

export type HistoryState = {
  past: StudioNode[][];
  future: StudioNode[][];
};

export function pushHistory(history: HistoryState, previousNodes: StudioNode[]): HistoryState {
  const past = [...history.past, previousNodes];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, future: [] };
}

export function undo(history: HistoryState, currentNodes: StudioNode[]): { history: HistoryState; nodes: StudioNode[] } | null {
  if (!history.past.length) return null;
  const past = [...history.past];
  const nodes = past.pop()!;
  const future = [currentNodes, ...history.future];
  return { history: { past, future }, nodes };
}

export function redo(history: HistoryState, currentNodes: StudioNode[]): { history: HistoryState; nodes: StudioNode[] } | null {
  if (!history.future.length) return null;
  const future = [...history.future];
  const nodes = future.shift()!;
  const past = [...history.past, currentNodes];
  return { history: { past, future }, nodes };
}
