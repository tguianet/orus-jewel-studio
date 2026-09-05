import { X } from "lucide-react";
import { StudioDataProvider, StudioTree } from "../registry/renderTree";
import type { StudioDataContext } from "../registry/types";
import type { StudioNode } from "../types/document";

export function PreviewOverlay({ nodes, data, onClose }: { nodes: StudioNode[]; data: StudioDataContext; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg"
        title="Fechar prévia"
      >
        <X className="h-4 w-4" />
      </button>
      <StudioDataProvider value={data}>
        <StudioTree nodes={nodes} editing={false} breakpoint="desktop" />
      </StudioDataProvider>
    </div>
  );
}
