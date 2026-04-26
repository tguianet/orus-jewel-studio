import { ExternalLink, Eye, Share2 } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const SellerStore = () => (
  <SellerLayout>
    <PageHeader
      eyebrow="Sua presença online"
      title="Minha loja"
      description="Visão geral da sua loja virtual pública."
      actions={
        <Link to="/loja/marina-aura" target="_blank">
          <Button variant="gold"><ExternalLink className="h-4 w-4" /> Abrir loja</Button>
        </Link>
      }
    />

    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
        <div className="aspect-[16/7] bg-gradient-gold relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-6 left-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/80">marina aura</p>
            <h2 className="font-display text-3xl text-primary-foreground">Joias com sua história</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">URL pública da sua loja</p>
              <p className="font-mono text-sm">aura.app/loja/marina-aura</p>
            </div>
            <Button variant="outline" size="sm"><Share2 className="h-4 w-4" /> Copiar</Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Visitas</p><p className="font-display text-2xl">412</p></div>
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Produtos ativos</p><p className="font-display text-2xl">4</p></div>
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Conversão</p><p className="font-display text-2xl">3,2%</p></div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Link to="/sacoleira/personalizacao" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
          <h4 className="font-display text-lg">Personalizar visual</h4>
          <p className="text-xs text-muted-foreground mt-1">Logo, banner e cores</p>
        </Link>
        <Link to="/sacoleira/catalogo" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
          <h4 className="font-display text-lg">Adicionar produtos</h4>
          <p className="text-xs text-muted-foreground mt-1">Selecione do catálogo Aura</p>
        </Link>
        <Link to="/sacoleira/meus-produtos" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
          <h4 className="font-display text-lg">Definir preços</h4>
          <p className="text-xs text-muted-foreground mt-1">Sua margem, sua escolha</p>
        </Link>
      </div>
    </div>
  </SellerLayout>
);

export default SellerStore;
