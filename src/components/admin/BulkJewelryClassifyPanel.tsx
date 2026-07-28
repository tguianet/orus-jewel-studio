import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Loader2, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/types/commerce";
import {
  JEWELRY_MATERIAL_LABELS,
  JEWELRY_MATERIAL_OPTIONS,
  PRODUCT_ACTIVE_WITHOUT_TYPE_WARNING,
  jewelryMaterialLabel,
  type JewelryMaterial,
} from "@/lib/jewelryMaterial";
import {
  confirmBulkClassifyMessage,
  emptyJewelryMaterialSummary,
  loadJewelryMaterialSummary,
  runBulkJewelryClassify,
  type BulkClassifyProgress,
  type JewelryMaterialSummary,
} from "@/lib/bulkJewelryMaterial";
import { toast } from "sonner";

type TypeFilter = "pending" | "all" | JewelryMaterial;
type StatusFilter = "all" | "active" | "inactive";

type Props = {
  products: Product[];
  onClose: () => void;
  onClassified: () => void | Promise<void>;
};

export function BulkJewelryClassifyPanel({ products, onClose, onClassified }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("pending");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [nameSearch, setNameSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<JewelryMaterialSummary>(emptyJewelryMaterialSummary());
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [confirmMaterial, setConfirmMaterial] = useState<JewelryMaterial | null>(null);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<BulkClassifyProgress | null>(null);
  const [lastFailedIds, setLastFailedIds] = useState<string[]>([]);
  const applyingRef = useRef(false);

  const reloadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await loadJewelryMaterialSummary());
    } catch {
      // Fallback local se RPC ainda não aplicada no Cloud
      const local: JewelryMaterialSummary = {
        total: products.length,
        pending: products.filter((p) => !p.jewelryMaterial).length,
        gold: products.filter((p) => p.jewelryMaterial === "gold").length,
        silver: products.filter((p) => p.jewelryMaterial === "silver").length,
        plated: products.filter((p) => p.jewelryMaterial === "plated").length,
        pending_active: products.filter((p) => !p.jewelryMaterial && p.active).length,
        pending_inactive: products.filter((p) => !p.jewelryMaterial && !p.active).length,
      };
      setSummary(local);
    } finally {
      setSummaryLoading(false);
    }
  }, [products]);

  useEffect(() => {
    void reloadSummary();
  }, [reloadSummary]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "Sem categoria"));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const filtered = useMemo(() => {
    const nameTerm = nameSearch.trim().toLowerCase();
    const codeTerm = codeSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchesType =
        typeFilter === "all"
        || (typeFilter === "pending" && !p.jewelryMaterial)
        || p.jewelryMaterial === typeFilter;
      const matchesStatus =
        statusFilter === "all"
        || (statusFilter === "active" && p.active)
        || (statusFilter === "inactive" && !p.active);
      const matchesCategory = categoryFilter === "Todas" || p.category === categoryFilter;
      const matchesName = !nameTerm || p.name.toLowerCase().includes(nameTerm);
      const matchesCode = !codeTerm || p.code.toLowerCase().includes(codeTerm);
      return matchesType && matchesStatus && matchesCategory && matchesName && matchesCode;
    });
  }, [products, typeFilter, statusFilter, categoryFilter, nameSearch, codeSearch]);

  const pendingInView = useMemo(
    () => filtered.filter((p) => !p.jewelryMaterial),
    [filtered],
  );
  const pendingActiveInView = pendingInView.filter((p) => p.active).length;
  const pendingInactiveInView = pendingInView.filter((p) => !p.active).length;

  const toggleId = (id: string) => {
    if (applying) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (applying) return;
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  };

  const clearSelection = () => {
    if (applying) return;
    setSelectedIds(new Set());
  };

  const runClassify = async (material: JewelryMaterial, ids: string[]) => {
    if (applyingRef.current) return;
    if (!ids.length) {
      toast.error("Selecione ao menos um produto.");
      return;
    }

    applyingRef.current = true;
    setApplying(true);
    setProgress({
      total: ids.length,
      processed: 0,
      updated: 0,
      unchanged: 0,
      failedIds: [],
      currentBatch: 0,
      totalBatches: 0,
      done: false,
    });
    setLastFailedIds([]);

    try {
      const result = await runBulkJewelryClassify({
        productIds: ids,
        material,
        onProgress: setProgress,
      });

      setLastFailedIds(result.failedIds);
      const label = JEWELRY_MATERIAL_LABELS[material];
      if (result.failedIds.length === 0) {
        toast.success(`${result.updated} produto(s) classificado(s) como ${label}.`);
      } else {
        toast.warning(
          `${result.updated} ok · ${result.failedIds.length} falha(s). Você pode repetir só as falhas.`,
        );
      }
      clearSelection();
      await onClassified();
      await reloadSummary();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha na classificação em massa.");
    } finally {
      applyingRef.current = false;
      setApplying(false);
      setConfirmMaterial(null);
    }
  };

  const progressPct = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl">Produtos pendentes de tipo de joia</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Classifique conscientemente como Ouro, Prata ou Folheado. Não há inferência automática.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={applying}>
          <X className="h-4 w-4" /> Fechar
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Total", value: summary.total },
          { label: "Pendentes", value: summary.pending },
          { label: "Ouro", value: summary.gold },
          { label: "Prata", value: summary.silver },
          { label: "Folheado", value: summary.plated },
          { label: "Ativos sem tipo", value: summary.pending_active },
          { label: "Inativos sem tipo", value: summary.pending_inactive },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
            <p className="text-lg font-medium tabular-nums">
              {summaryLoading ? "…" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">
        Lista filtrada: <span className="text-foreground font-medium">{filtered.length}</span>
        {" · "}pendentes na vista: <span className="text-foreground font-medium">{pendingInView.length}</span>
        {" · "}ativos {pendingActiveInView} / inativos {pendingInactiveInView}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)} disabled={applying}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Sem tipo</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              {JEWELRY_MATERIAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} disabled={applying}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={applying}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bulk-name">Busca por nome</Label>
          <Input
            id="bulk-name"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Nome…"
            disabled={applying}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bulk-code">Busca por código/SKU</Label>
          <Input
            id="bulk-code"
            value={codeSearch}
            onChange={(e) => setCodeSearch(e.target.value)}
            placeholder="Código…"
            disabled={applying}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={selectAllVisible} disabled={applying || filtered.length === 0}>
          <CheckSquare className="h-4 w-4" /> Selecionar todos filtrados ({filtered.length})
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearSelection} disabled={applying || selectedIds.size === 0}>
          <Square className="h-4 w-4" /> Limpar seleção
        </Button>
        <span className="self-center text-sm text-muted-foreground">
          {selectedIds.size} selecionado(s)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {JEWELRY_MATERIAL_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant="gold"
            size="sm"
            disabled={applying || selectedIds.size === 0}
            onClick={() => setConfirmMaterial(opt.value)}
          >
            Definir como {opt.label}
          </Button>
        ))}
        {lastFailedIds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={applying}
            onClick={() => {
              setSelectedIds(new Set(lastFailedIds));
              toast.message("Seleção atualizada com os IDs que falharam. Escolha o tipo novamente.");
            }}
          >
            Repetir falhas ({lastFailedIds.length})
          </Button>
        )}
      </div>

      {(applying || progress) && (
        <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {applying && <Loader2 className="h-4 w-4 animate-spin" />}
              Progresso: {progress?.processed ?? 0}/{progress?.total ?? 0}
            </span>
            <span className="text-muted-foreground">
              Lote {progress?.currentBatch ?? 0}/{progress?.totalBatches ?? 0}
              {" · "}atualizados {progress?.updated ?? 0}
            </span>
          </div>
          <Progress value={progressPct} />
          {progress?.failedIds.length ? (
            <p className="text-xs text-destructive">
              Falhas neste ciclo: {progress.failedIds.length}
              {progress.errorMessage ? ` — ${progress.errorMessage}` : ""}
            </p>
          ) : null}
        </div>
      )}

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2 w-10">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                  onCheckedChange={(checked) => {
                    if (applying) return;
                    if (checked) selectAllVisible();
                    else clearSelection();
                  }}
                  aria-label="Selecionar todos filtrados"
                />
              </th>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum produto com esses filtros.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const pending = !p.jewelryMaterial;
                return (
                  <tr key={p.id} className="border-b border-border/60 hover:bg-secondary/20">
                    <td className="px-3 py-2 align-middle">
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleId(p.id)}
                        disabled={applying}
                        aria-label={`Selecionar ${p.name}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image || "/placeholder.svg"}
                          alt=""
                          className="h-12 w-12 rounded-md object-cover border border-border"
                        />
                        <div>
                          <p className="font-medium leading-tight">{p.name}</p>
                          {pending && p.active && (
                            <p className="text-[11px] text-destructive mt-0.5 max-w-xs">
                              {PRODUCT_ACTIVE_WITHOUT_TYPE_WARNING}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                    <td className="px-3 py-2">{p.category}</td>
                    <td className="px-3 py-2">{p.active ? "Ativo" : "Inativo"}</td>
                    <td className="px-3 py-2">{jewelryMaterialLabel(p.jewelryMaterial)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!confirmMaterial}
        onOpenChange={(open) => {
          if (!open && !applying) setConfirmMaterial(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar classificação</DialogTitle>
            <DialogDescription>
              {confirmMaterial
                ? confirmBulkClassifyMessage(selectedIds.size, confirmMaterial)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Somente o campo <strong>tipo da joia</strong> será alterado. Preço, estoque, status e pedidos não mudam.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmMaterial(null)} disabled={applying}>
              Cancelar
            </Button>
            <Button
              variant="gold"
              disabled={applying || !confirmMaterial}
              onClick={() => {
                if (!confirmMaterial) return;
                void runClassify(confirmMaterial, Array.from(selectedIds));
              }}
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
