import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadJfCatalogPreview, type JfPreviewProduct } from "@/lib/jfCatalogPreview";

export function JfCatalogPreview() {
  const enabled = import.meta.env.VITE_JF_CATALOG_PREVIEW_ENABLED === "true";
  const publicKey = import.meta.env.VITE_JF_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  const [products, setProducts] = useState<JfPreviewProduct[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function load(nextPage: number) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true); setError(""); setLoaded(false); setProducts([]); setHasMore(false);
    try {
      const result = await loadJfCatalogPreview({ enabled, publicKey }, nextPage, fetch, current.signal);
      if (current.signal.aborted) return;
      setProducts(result.products); setHasMore(result.hasMore); setPage(nextPage); setLoaded(true);
    } catch (e) {
      if (!current.signal.aborted) setError(e instanceof Error ? e.message : "Falha ao consultar catálogo.");
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }

  return <section className="rounded-xl border border-border bg-card p-6 space-y-4">
    <div>
      <h3 className="font-display text-xl">Catálogo JF Metais — prévia</h3>
      <p className="text-sm text-muted-foreground mt-2">Consulta de produtos e estoque. Peças desta prévia ainda não estão disponíveis para venda no Orus.</p>
      <p className="text-xs text-muted-foreground mt-2">A disponibilidade é conferida no momento da consulta e não representa reserva de peças.</p>
    </div>
    {!enabled || !publicKey ? <p className="text-sm">Prévia desativada neste ambiente.</p> : <>
      <Button variant="goldOutline" disabled={busy} onClick={() => void load(0)}>{busy ? "Consultando…" : "Consultar catálogo JF"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loaded && products.length === 0 && <p role="status">Nenhum produto JF disponível para consulta.</p>}
      {loaded && products.length > 0 && <>
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => <article key={p.sourceId} className="border border-border rounded-lg p-3 flex gap-3">
            {p.image && <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-20 h-20 object-cover rounded shrink-0" />}
            <div className="min-w-0"><h4 className="font-medium break-words">{p.name}</h4><p className="text-xs text-muted-foreground">SKU: {p.sku || "Sem código"}</p><p className="text-sm">Estoque consultado: {p.stock}</p>
              {p.variants.length > 0 && <p className="text-xs text-muted-foreground">{p.variants.map((v) => `${v.size}: ${v.stock}`).join(" · ")}</p>}
            </div>
          </article>)}
        </div>
        <div className="flex items-center gap-3"><Button variant="outline" disabled={busy || page === 0} onClick={() => void load(page - 1)}>Anterior</Button><span className="text-sm">Página {page + 1}</span><Button variant="outline" disabled={busy || !hasMore} onClick={() => void load(page + 1)}>Próxima</Button></div>
      </>}
    </>}
  </section>;
}
