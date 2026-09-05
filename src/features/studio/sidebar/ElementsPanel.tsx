import { listNodeDefinitions } from "../registry";
import type { StudioNodeCategory } from "../registry/types";
import { resolveIcon } from "../utils/resolveIcon";
import { useStudioStore } from "../store/StudioStoreContext";
import { addElementNode } from "../registry/insertionHelpers";

const GROUPS: { category: StudioNodeCategory; label: string }[] = [
  { category: "layout", label: "Layout" },
  { category: "text", label: "Texto" },
  { category: "media", label: "Mídia" },
  { category: "action", label: "Ações" },
  { category: "product", label: "Produtos" },
];

export function ElementsPanel() {
  const { state, dispatch } = useStudioStore();

  return (
    <div className="p-3 space-y-5">
      {GROUPS.map((group) => {
        const defs = listNodeDefinitions(group.category);
        if (!defs.length) return null;
        return (
          <div key={group.category}>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 px-1">{group.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {defs.map((def) => {
                const Icon = resolveIcon(def.icon);
                return (
                  <button
                    key={def.type}
                    onClick={() => addElementNode(dispatch, state, def.type)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors p-3 text-center"
                    title={`Adicionar ${def.label}`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[11px] leading-tight">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
