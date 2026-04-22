import { SellerLayout } from "@/layouts/SellerLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SellerSettings = () => (
  <SellerLayout>
    <PageHeader eyebrow="Conta" title="Configurações" description="Seus dados e preferências." />
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
      <div><Label>Nome completo</Label><Input defaultValue="Marina Costa" className="mt-1.5" /></div>
      <div><Label>Email</Label><Input defaultValue="marina@email.com" className="mt-1.5" /></div>
      <div><Label>WhatsApp (recebe pedidos)</Label><Input defaultValue="(11) 98765-4321" className="mt-1.5" /></div>
      <Button variant="gold" className="w-full">Salvar alterações</Button>
    </div>
  </SellerLayout>
);

export default SellerSettings;
