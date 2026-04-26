import { ShoppingBag, DollarSign, Heart, Eye, ExternalLink } from "lucide-react";
import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { storeOrders, formatBRL, statusColors, statusLabels } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const SellerDashboard = () => (
  <SellerLayout>
    <PageHeader
      eyebrow="Marina Aura"
      title="Bem-vinda, Marina"
      description="Resumo da sua loja virtual e dos pedidos recebidos."
      actions={
        <Link to="/loja/marina-aura" target="_blank">
          <Button variant="goldOutline"><ExternalLink className="h-4 w-4" /> Ver minha loja</Button>
        </Link>
      }
    />

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <StatCard label="Vendas (mês)" value={formatBRL(2480)} icon={DollarSign} trend="+24%" />
      <StatCard label="Pedidos novos" value="3" icon={ShoppingBag} hint="aguardando contato" />
      <StatCard label="Visitas na loja" value="412" icon={Eye} trend="+38" hint="esta semana" />
      <StatCard label="Comissões pendentes" value="18" icon={Heart} hint="2+ compras" />
    </div>

    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-xl">Pedidos recentes</h3>
          <Link to="/sacoleira/pedidos"><Button variant="ghost" size="sm">Ver todos</Button></Link>
        </div>
        <div className="divide-y divide-border">
          {storeOrders.map(o => (
            <div key={o.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{o.customer}</p>
                <p className="text-xs text-muted-foreground">{o.id} · {o.items} itens</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatBRL(o.total)}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusColors[o.status]}`}>{statusLabels[o.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-gradient-gold-soft p-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Próximo passo</p>
        <h3 className="font-display text-2xl mb-2">Adicione mais brilho à sua vitrine</h3>
        <p className="text-sm text-muted-foreground mb-4">Você está exibindo 4 produtos. Adicione novos do catálogo Aura para atrair mais clientes.</p>
        <Link to="/sacoleira/catalogo"><Button variant="gold" className="w-full">Explorar catálogo</Button></Link>
      </div>
    </div>
  </SellerLayout>
);

export default SellerDashboard;
