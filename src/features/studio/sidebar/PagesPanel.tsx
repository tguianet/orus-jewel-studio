import { Home, Lock } from "lucide-react";

export function PagesPanel() {
  return (
    <div className="p-3 space-y-2">
      <div className="w-full flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-left">
        <Home className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Home</p>
          <p className="text-[11px] text-muted-foreground">Página inicial da loja</p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>Múltiplas páginas chegam numa próxima etapa do Studio. Por enquanto, edite a página inicial da loja.</p>
      </div>
    </div>
  );
}
