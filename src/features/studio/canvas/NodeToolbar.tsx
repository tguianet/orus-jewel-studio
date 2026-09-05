import { ArrowUp, ArrowDown, Copy, Trash2, CornerUpLeft, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import type { StudioNode } from "../types/document";

type Props = {
  node: StudioNode;
  rect: { top: number; left: number; width: number };
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectParent: () => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
};

export function NodeToolbar({ node, rect, onMoveUp, onMoveDown, onDuplicate, onDelete, onSelectParent, onToggleHidden, onToggleLocked }: Props) {
  const top = Math.max(rect.top - 34, 4);
  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 rounded-md bg-foreground text-background shadow-lg px-1.5 py-1 text-xs pointer-events-auto"
      style={{ top, left: Math.max(rect.left, 4) }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="px-1.5 font-medium max-w-[140px] truncate">{node.name || node.type}</span>
      <div className="w-px h-4 bg-background/20 mx-0.5" />
      <button title="Selecionar pai" onClick={onSelectParent} className="p-1 hover:bg-background/20 rounded">
        <CornerUpLeft className="h-3.5 w-3.5" />
      </button>
      <button title="Mover para cima" onClick={onMoveUp} className="p-1 hover:bg-background/20 rounded">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button title="Mover para baixo" onClick={onMoveDown} className="p-1 hover:bg-background/20 rounded">
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button title="Duplicar" onClick={onDuplicate} className="p-1 hover:bg-background/20 rounded">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button title={node.hidden ? "Mostrar" : "Ocultar"} onClick={onToggleHidden} className="p-1 hover:bg-background/20 rounded">
        {node.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button title={node.locked ? "Destravar" : "Travar"} onClick={onToggleLocked} className="p-1 hover:bg-background/20 rounded">
        {node.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      </button>
      <button title="Excluir" onClick={onDelete} className="p-1 hover:bg-destructive/80 rounded" disabled={node.locked}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
