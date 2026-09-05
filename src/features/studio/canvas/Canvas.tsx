import { useLayoutEffect, useRef, useState } from "react";
import { useStudioStore } from "../store/StudioStoreContext";
import { StudioDataProvider, StudioTree } from "../registry/renderTree";
import type { StudioDataContext } from "../registry/types";
import { DeviceFrame } from "./DeviceFrame";
import { NodeToolbar } from "./NodeToolbar";
import { findParent, findNode } from "../utils/tree";

type Rect = { top: number; left: number; width: number };

export function Canvas({ data, loading, zoom = 1 }: { data: StudioDataContext; loading: boolean; zoom?: number }) {
  const { state, dispatch } = useStudioStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarRect, setToolbarRect] = useState<Rect | null>(null);

  const selectedId = state.selectedId;

  useLayoutEffect(() => {
    if (!selectedId || !containerRef.current) {
      setToolbarRect(null);
      return;
    }
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`[data-studio-id="${selectedId}"]`);
      if (!el) {
        setToolbarRect(null);
        return;
      }
      const containerBox = container.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      setToolbarRect({
        top: box.top - containerBox.top + container.scrollTop,
        left: box.left - containerBox.left + container.scrollLeft,
        width: box.width,
      });
    };
    measure();
    const container = containerRef.current;
    container.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    const raf = requestAnimationFrame(measure);
    return () => {
      container.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [selectedId, state.document.nodes, state.breakpoint]);

  const selectedNode = selectedId ? findNode(state.document.nodes, selectedId) : null;

  const moveSelected = (dir: -1 | 1) => {
    if (!selectedId) return;
    const info = findParent(state.document.nodes, selectedId);
    if (!info) return;
    const toIndex = info.index + dir;
    if (toIndex < 0 || toIndex >= info.siblings.length) return;
    dispatch({ type: "MOVE_NODE", nodeId: selectedId, toParentId: info.parent?.id ?? null, toIndex });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto bg-muted/40"
      onClick={() => dispatch({ type: "SELECT", id: null })}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Carregando loja…</div>
      ) : (
        <DeviceFrame breakpoint={state.breakpoint} zoom={zoom}>
          <StudioDataProvider value={data}>
            <StudioTree
              nodes={state.document.nodes}
              editing
              breakpoint={state.breakpoint}
              selectedId={state.selectedId}
              hoveredId={state.hoveredId}
              onSelect={(id) => dispatch({ type: "SELECT", id })}
              onHover={(id) => dispatch({ type: "HOVER", id })}
              onPropChange={(nodeId, field, value) => dispatch({ type: "UPDATE_PROPS", nodeId, patch: { [field]: value } })}
            />
          </StudioDataProvider>
        </DeviceFrame>
      )}

      {selectedNode && toolbarRect && (
        <NodeToolbar
          node={selectedNode}
          rect={toolbarRect}
          onMoveUp={() => moveSelected(-1)}
          onMoveDown={() => moveSelected(1)}
          onDuplicate={() => dispatch({ type: "DUPLICATE_NODE", nodeId: selectedNode.id })}
          onDelete={() => dispatch({ type: "REMOVE_NODE", nodeId: selectedNode.id })}
          onSelectParent={() => {
            const info = findParent(state.document.nodes, selectedNode.id);
            dispatch({ type: "SELECT", id: info?.parent?.id ?? null });
          }}
          onToggleHidden={() => dispatch({ type: "TOGGLE_HIDDEN", nodeId: selectedNode.id })}
          onToggleLocked={() => dispatch({ type: "TOGGLE_LOCKED", nodeId: selectedNode.id })}
        />
      )}
    </div>
  );
}
