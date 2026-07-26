import { FormEvent, useEffect, useState } from "react";
import { Plus, Edit2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { createCategory, loadCategories } from "@/lib/categories";
import type { Category } from "@/types/commerce";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const AdminCategories = () => {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadCategories();
      setItems(rows);
    } catch (err: unknown) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Não foi possível carregar as categorias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const created = await createCategory({ name: trimmedName, description });
      setItems((current) => [created, ...current]);
      setName("");
      setDescription("");
      setOpen(false);
      toast.success("Categoria salva com sucesso.");
    } catch (err: unknown) {
      toast.error("Não foi possível salvar a categoria.", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Organização"
        title="Categorias"
        description="Categorias usadas para classificar suas joias no catálogo."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gold"><Plus className="h-4 w-4" /> Nova categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova categoria</DialogTitle>
                <DialogDescription>Cadastre uma categoria para organizar o catálogo de joias.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="category-name" className="text-sm font-medium">Nome</label>
                  <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Piercings" autoFocus />
                </div>
                <div className="space-y-2">
                  <label htmlFor="category-description" className="text-sm font-medium">Descrição</label>
                  <Textarea id="category-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resumo interno da categoria" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="gold" disabled={saving}>{saving ? "Salvando..." : "Salvar categoria"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Carregando categorias…</p>
      ) : !error && items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">/{c.slug}</p>
                  <h3 className="font-display text-2xl">{c.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{c.count} produtos</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                  setName(c.name);
                  setDescription(c.description || "");
                  setOpen(true);
                }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <Link to={`/admin/produtos?categoria=${encodeURIComponent(c.name)}`}>
                <Button variant="goldOutline" className="mt-4 w-full justify-between">
                  Ver categoria <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCategories;
