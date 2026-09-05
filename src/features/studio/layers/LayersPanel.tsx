import { useState, type DragEvent } from "react";
import { ChevronRight, ChevronDown, GripVertical, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useStudioStore } from "../store/StudioStoreContext";
import type { StudioNode } from "../types/document";
import { resolveIcon } from "../utils/resolveIcon";
import { getNodeDefinition } from "../registry";

type DragInfo = { nodeId: string; parentId: string | null; index: number };

export function LayersPanel() {
  const { state, dispatch } = useStudioStore();
  const [dragging, setDragging] = useState<DragInfo | null>(null);
  const [dropTarget, setDropTarget] = useState<{ parentId: string | null; index: number } | null>(null);

  const handleDrop = () => {
    if (dragging && dropTarget && dropTarget.parentId === dragging.parentId) {
      let toIndex = dropTarget.index;
      if (toIndex > dragging.index) toIndex -= 1;
      if (toIndex !== dragging.index) {
        dispatch({ type: "MOVE_NODE", nodeId: dragging.nodeId, toParentId: dropTarget.parentId, toIndex });
      }
    }
    setDragging(null);
    setDropTarget(null);
  };

  if (!state.document.nodes.length) {
    return <p className="p-4 text-sm text-muted-foreground">Nenhuma seção ainda. Adicione uma pela aba Seções.</p>;
  }

  return (
    <div className="py-2" onDragEnd={() => { setDragging(null); setDropTarget(null); }}>
      <LayerList
        nodes={state.document.nodes}
        parentId={null}
        depth={0}
        selectedId={state.selectedId}
        onSelect={(id) => dispatch({ type: "SELECT", id })}
        onToggleHidden={(id) => dispatch({ type: "TOGGLE_HIDDEN", nodeId: id })}
        onToggleLocked={(id) => dispatch({ type: "TOGGLE_LOCKED", nodeId: id })}
        onRename={(id, name) => dispatch({ type: "RENAME_NODE", nodeId: id, name })}
        dragging={dragging}
        dropTarget={dropTarget}
        setDragging={setDragging}
        setDropTarget={setDropTarget}
        onDrop={handleDrop}
      />
    </div>
  );
}

function LayerList({
  nodes,
  parentId,
  depth,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onRename,
  dragging,
  dropTarget,
  setDragging,
  setDropTarget,
  onDrop,
}: {
  nodes: StudioNode[];
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string, name: string) => void;
  dragging: DragInfo | null;
  dropTarget: { parentId: string | null; index: number } | null;
  setDragging: (d: DragInfo | null) => void;
  setDropTarget: (d: { parentId: string | null; index: number } | null) => void;
  onDrop: () => void;
}) {
  return (
    <>
      {nodes.map((node, index) => (
        <div key={node.id}>
          {dropTarget?.parentId === parentId && dropTarget.index === index && (
            <div className="h-0.5 bg-primary mx-3 rounded" />
          )}
          <LayerRow
            node={node}
            depth={depth}
            selected={selectedId === node.id}
            onSelect={onSelect}
            onToggleHidden={onToggleHidden}
            onToggleLocked={onToggleLocked}
            onRename={onRename}
            draggable={!node.locked}
            onDragStart={(e: DragEvent) => {
              e.dataTransfer.effectAllowed = "move";
              setDragging({ nodeId: node.id, parentId, index });
            }}
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              if (dragging && dragging.parentId === parentId) {
                setDropTarget({ parentId, index });
              }
            }}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              onDrop();
            }}
          />
          {node.children && node.children.length > 0 && (
            <LayerList
              nodes={node.children}
              parentId={node.id}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
              onRename={onRename}
              dragging={dragging}
              dropTarget={dropTarget}
              setDragging={setDragging}
              setDropTarget={setDropTarget}
              onDrop={onDrop}
            />
          )}
        </div>
      ))}
      {dropTarget?.parentId === parentId && dropTarget.index === nodes.length && (
        <div className="h-0.5 bg-primary mx-3 rounded" />
      )}
    </>
  );
}

function LayerRow({
  node,
  depth,
  selected,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onRename,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  node: StudioNode;
  depth: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string, name: string) => void;
  draggable: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const def = getNodeDefinition(node.type);
  const Icon = resolveIcon(def.icon);
  const hasChildren = !!node.children?.length;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onSelect(node.id)}
      className={`group flex items-center gap-1 pr-2 py-1.5 cursor-pointer text-sm ${selected ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      {hasChildren ? (
        <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} className="p-0.5">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <span className="w-4" />
      )}
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {editingName ? (
        <input
          autoFocus
          defaultValue={node.name || node.type}
          className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-sm"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            onRename(node.id, e.currentTarget.value.trim() || node.type);
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      ) : (
        <span className="flex-1 min-w-0 truncate" onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}>
          {node.name || node.type}
        </span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onToggleHidden(node.id); }} className="p-0.5 opacity-0 group-hover:opacity-100 shrink-0">
        {node.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={(e) => { e.stopPropagation(); onToggleLocked(node.id); }} className="p-0.5 opacity-0 group-hover:opacity-100 shrink-0">
        {node.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
