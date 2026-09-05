import { Undo2, Redo2, Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, Eye, ArrowLeft, Loader2, Check, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "../store/StudioStoreContext";
import type { Breakpoint, SaveStatus } from "../types/document";

const DEVICES: { key: Breakpoint; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

function SaveStatusPill({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { label: string; className: string; icon: React.ReactNode }> = {
    idle: { label: "Sem alterações", className: "text-muted-foreground", icon: null },
    saved: { label: "Salvo", className: "text-emerald-600", icon: <Check className="h-3.5 w-3.5" /> },
    saving: { label: "Salvando…", className: "text-muted-foreground", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    unsaved: { label: "Não salvo", className: "text-amber-600", icon: null },
    error: { label: "Erro ao salvar", className: "text-destructive", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const m = map[status];
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${m.className}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

type Props = {
  storeName: string;
  storeSlug: string | null;
  zoom: number;
  onZoomChange: (z: number) => void;
  onPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
  publishing: boolean;
};

export function Topbar({ storeName, storeSlug, zoom, onZoomChange, onPreview, onSave, onPublish, publishing }: Props) {
  const { state, dispatch } = useStudioStore();

  return (
    <div className="h-14 shrink-0 border-b border-border bg-card flex items-center gap-3 px-3">
      <Link to="/sacoleira/loja" className="p-2 rounded-md hover:bg-muted shrink-0" title="Voltar">
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="min-w-0 shrink-0 max-w-[180px]">
        <p className="text-sm font-medium truncate">{storeName}</p>
        <p className="text-[11px] text-muted-foreground truncate">Studio V2 · Home</p>
      </div>

      <div className="w-px h-7 bg-border mx-1 shrink-0" />

      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 shrink-0">
        {DEVICES.map((d) => {
          const Icon = d.icon;
          const active = state.breakpoint === d.key;
          return (
            <button
              key={d.key}
              title={d.label}
              onClick={() => dispatch({ type: "SET_BREAKPOINT", breakpoint: d.key })}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${active ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button title="Desfazer" disabled={!state.history.past.length} onClick={() => dispatch({ type: "UNDO" })} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </button>
        <button title="Refazer" disabled={!state.history.future.length} onClick={() => dispatch({ type: "REDO" })} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button title="Diminuir zoom" onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button title="Aumentar zoom" onClick={() => onZoomChange(Math.min(1.5, zoom + 0.1))} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1" />

      <SaveStatusPill status={state.saveStatus} />

      <Button variant="outline" size="sm" onClick={onPreview}>
        <Eye className="h-4 w-4" /> Preview
      </Button>
      <Button variant="outline" size="sm" onClick={onSave} disabled={state.saveStatus === "saving"}>
        Salvar
      </Button>
      <Button variant="gold" size="sm" onClick={onPublish} disabled={publishing}>
        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Publicar
      </Button>
    </div>
  );
}
