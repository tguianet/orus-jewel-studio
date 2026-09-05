import { useState } from "react";
import { useSelectedNode, useStudioStore } from "../store/StudioStoreContext";
import { getNodeDefinition } from "../registry";
import { ContentTab } from "./ContentTab";
import { DesignTab } from "./DesignTab";
import { LayoutTab } from "./LayoutTab";

type TabKey = "content" | "design" | "layout";

export function Inspector() {
  const node = useSelectedNode();
  const { state, dispatch } = useStudioStore();
  const [tab, setTab] = useState<TabKey>("content");

  if (!node) {
    return (
      <div className="w-80 shrink-0 h-full border-l border-border bg-card flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Selecione um elemento no canvas para editar suas propriedades.</p>
      </div>
    );
  }

  const def = getNodeDefinition(node.type);

  return (
    <div className="w-80 shrink-0 h-full border-l border-border bg-card flex flex-col">
      <div className="px-4 h-12 flex items-center justify-between border-b border-border shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{node.name || def.label}</p>
          <p className="text-[11px] text-muted-foreground">{def.label}</p>
        </div>
      </div>
      <div className="flex border-b border-border shrink-0">
        {([
          { key: "content", label: "Conteúdo" },
          { key: "design", label: "Design" },
          { key: "layout", label: "Layout" },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "content" && (
          <ContentTab node={node} onChange={(field, value) => dispatch({ type: "UPDATE_PROPS", nodeId: node.id, patch: { [field]: value } })} />
        )}
        {tab === "design" && (
          <DesignTab
            node={node}
            breakpoint={state.breakpoint}
            onChange={(patch) => dispatch({ type: "UPDATE_STYLE", nodeId: node.id, breakpoint: state.breakpoint, patch })}
          />
        )}
        {tab === "layout" && (
          <LayoutTab
            node={node}
            breakpoint={state.breakpoint}
            onChange={(patch) => dispatch({ type: "UPDATE_STYLE", nodeId: node.id, breakpoint: state.breakpoint, patch })}
          />
        )}
      </div>
    </div>
  );
}
