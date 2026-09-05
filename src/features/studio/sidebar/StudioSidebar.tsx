import { useState, type ReactNode } from "react";
import { Shapes, Rows3, Layers, Image as ImageIcon, FileText } from "lucide-react";
import { ElementsPanel } from "./ElementsPanel";
import { SectionsPanel } from "./SectionsPanel";
import { LayersPanel } from "../layers/LayersPanel";
import { MediaPanel } from "../media/MediaPanel";
import { PagesPanel } from "./PagesPanel";

type TabKey = "elements" | "sections" | "layers" | "media" | "pages";

const TABS: { key: TabKey; label: string; icon: typeof Shapes }[] = [
  { key: "elements", label: "Elementos", icon: Shapes },
  { key: "sections", label: "Seções", icon: Rows3 },
  { key: "layers", label: "Camadas", icon: Layers },
  { key: "media", label: "Mídia", icon: ImageIcon },
  { key: "pages", label: "Páginas", icon: FileText },
];

export function StudioSidebar({ storeId }: { storeId: string | null }) {
  const [active, setActive] = useState<TabKey | null>("sections");

  const panels: Record<TabKey, ReactNode> = {
    elements: <ElementsPanel />,
    sections: <SectionsPanel />,
    layers: <LayersPanel />,
    media: <MediaPanel storeId={storeId} />,
    pages: <PagesPanel />,
  };

  return (
    <div className="relative flex h-full">
      <div className="w-14 shrink-0 h-full border-r border-border bg-card flex flex-col items-center py-3 gap-1 z-30">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(isActive ? null : tab.key)}
              title={tab.label}
              className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px] uppercase tracking-wide transition-colors ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div
        className={`absolute top-0 bottom-0 left-14 w-80 max-w-[85vw] bg-card border-r border-border shadow-2xl z-20 transition-transform duration-200 ease-out flex flex-col ${
          active ? "translate-x-0" : "-translate-x-[110%]"
        }`}
      >
        {active && (
          <>
            <div className="px-4 h-12 flex items-center border-b border-border shrink-0">
              <h2 className="text-sm font-medium">{TABS.find((t) => t.key === active)?.label}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">{panels[active]}</div>
          </>
        )}
      </div>
    </div>
  );
}
