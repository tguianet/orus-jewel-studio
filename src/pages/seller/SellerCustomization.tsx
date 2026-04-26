import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const palettes = [
  { name: "Dourado clássico", colors: ["#1a1410", "#d4a747", "#f5e6c8"] },
  { name: "Rosé elegante", colors: ["#1a1014", "#d4877a", "#f5d6cb"] },
  { name: "Preto & nude", colors: ["#0e0e0e", "#c8b59c", "#e8dcc8"] },
  { name: "Champanhe", colors: ["#181410", "#e8c97a", "#f8efd7"] },
];

const SellerCustomization = () => (
  <SellerLayout>
    <PageHeader eyebrow="Identidade" title="Personalização visual" description="Deixe sua loja com a sua cara, dentro de paletas elegantes." />

    <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display text-xl">Identidade da loja</h3>
        <div><Label>Nome da loja</Label><Input defaultValue="Marina Aura" className="mt-1.5" /></div>
        <div><Label>Slug (URL)</Label><Input defaultValue="marina-joias" className="mt-1.5" /></div>
        <div><Label>Slogan</Label><Input defaultValue="Joias com sua história" className="mt-1.5" /></div>
        <div><Label>Sobre a loja</Label><Textarea rows={4} defaultValue="Selecionamos as peças mais delicadas para você brilhar todos os dias." className="mt-1.5" /></div>
        <Button variant="gold" className="w-full">Salvar identidade</Button>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-xl mb-4">Paleta de cores</h3>
          <div className="grid grid-cols-2 gap-3">
            {palettes.map((p, i) => (
              <button key={p.name} className={`group text-left p-3 rounded-lg border ${i === 0 ? "border-primary" : "border-border"} hover:border-primary/60 transition-colors`}>
                <div className="flex gap-1.5 mb-2">
                  {p.colors.map(c => <span key={c} className="h-8 flex-1 rounded" style={{ background: c }} />)}
                </div>
                <p className="text-sm font-medium">{p.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-xl mb-4">Logo & banner</h3>
          <div className="space-y-3">
            <div className="aspect-[3/1] rounded-lg border-2 border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
              Clique para enviar banner
            </div>
            <div className="aspect-square w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Logo
            </div>
          </div>
        </div>
      </div>
    </div>
  </SellerLayout>
);

export default SellerCustomization;
