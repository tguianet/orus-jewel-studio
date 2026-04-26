import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const AdminSettings = () => (
  <AdminLayout>
    <PageHeader eyebrow="Configurações" title="Ajustes gerais" description="Dados da sua marca, regras de comissões, marca e integrações." />

    <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display text-xl">Marca</h3>
        <div><Label>Nome da empresa</Label><Input defaultValue="Aura Store Suite" className="mt-1.5" /></div>
        <div><Label>Email de contato</Label><Input defaultValue="contato@aurastore.com" className="mt-1.5" /></div>
        <div><Label>WhatsApp comercial</Label><Input defaultValue="(11) 99000-0000" className="mt-1.5" /></div>
        <Button variant="gold" className="w-full">Salvar</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display text-xl">Regras de atacado</h3>
        <div><Label>Pedido mínimo (R$)</Label><Input defaultValue="200" className="mt-1.5" /></div>
        <div><Label>Desconto padrão (%)</Label><Input defaultValue="10" className="mt-1.5" /></div>
        <div><Label>Desconto VIP (%)</Label><Input defaultValue="15" className="mt-1.5" /></div>
        <Button variant="goldOutline" className="w-full">Atualizar regras</Button>
      </div>
    </div>
  </AdminLayout>
);

export default AdminSettings;
