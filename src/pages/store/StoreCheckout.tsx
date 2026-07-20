import { useOutletContext, useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Sacoleira, formatBRL } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

type Step = "form" | "processing" | "success";

type OrderResult = {
  order_id: string;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
};

type OrderLineSnapshot = {
  name: string;
  qty: number;
  unitPrice: number;
};

const StoreCheckout = () => {
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const { items, total, clear } = useCart();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [step, setStep] = useState<Step>("form");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [lineSnapshot, setLineSnapshot] = useState<OrderLineSnapshot[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    // Frontend envia só product_id + quantity (sem preços/status)
    const payloadItems = items.map((i) => ({
      product_id: i.product.id,
      quantity: i.qty,
    }));
    const snapshot: OrderLineSnapshot[] = items.map((i) => ({
      name: i.product.name,
      qty: i.qty,
      unitPrice: i.price,
    }));

    setSubmitting(true);
    setStep("processing");
    try {
      const { data, error } = await supabase.rpc("create_public_order", {
        p_seller_store_id: store.id,
        p_customer_name: form.name.trim(),
        p_customer_phone: form.phone.trim(),
        p_customer_address: form.address.trim() || null,
        p_notes: form.notes.trim() || null,
        p_items: payloadItems,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.order_id) {
        throw new Error("Resposta inválida do servidor");
      }

      setOrder({
        order_id: row.order_id,
        status: row.status,
        subtotal: Number(row.subtotal),
        total: Number(row.total),
        created_at: row.created_at,
      });
      setLineSnapshot(snapshot);
      clear();
      setStep("success");
      toast.success("Pedido enviado com sucesso");
    } catch (err: unknown) {
      console.error("[checkout] erro ao criar pedido:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Não foi possível enviar o pedido";
      toast.error("Erro ao enviar pedido", { description: message });
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsApp = () => {
    if (!order) return;
    const shortId = order.order_id.slice(0, 8);
    const lines = [
      `*Pedido recebido — aguardando confirmação*`,
      `*Loja:* ${store.storeName}`,
      "",
      `*Pedido:* ${shortId}`,
      `*Status:* aguardando confirmação`,
      "",
      `*Cliente:* ${form.name}`,
      `*WhatsApp:* ${form.phone}`,
      form.address ? `*Endereço:* ${form.address}` : "",
      form.notes ? `*Obs:* ${form.notes}` : "",
      "",
      "*Itens:*",
      ...lineSnapshot.map(
        (i) =>
          `• ${i.qty}x ${i.name} — ${formatBRL(i.unitPrice)} un. = ${formatBRL(i.unitPrice * i.qty)}`,
      ),
      "",
      `*Total:* ${formatBRL(order.total)}`,
      "",
      "_Combine o pagamento com a revendedora._",
    ]
      .filter(Boolean)
      .join("\n");

    const phone = store.phone.replace(/\D/g, "");
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(
      `https://wa.me/${fullPhone}?text=${encodeURIComponent(lines)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const finish = () => {
    nav(`/loja/${store.storeSlug}`);
  };

  return (
    <div className="container py-8 grid lg:grid-cols-3 gap-8 max-w-5xl">
      <form onSubmit={submitOrder} className="lg:col-span-2 space-y-4">
        <h1 className="font-display text-3xl mb-2">Finalizar pedido</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Preencha seus dados para enviar o pedido. O pagamento é combinado diretamente com a revendedora.
        </p>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label>Nome completo *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5"
              disabled={submitting}
              required
            />
          </div>
          <div>
            <Label>WhatsApp *</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              className="mt-1.5"
              disabled={submitting}
              required
            />
          </div>
          <div>
            <Label>Endereço de entrega</Label>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1.5"
              disabled={submitting}
            />
          </div>
          <div>
            <Label>Observações do pedido</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1.5"
              disabled={submitting}
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting || items.length === 0}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando pedido...
            </>
          ) : (
            <>Enviar pedido — {formatBRL(total)}</>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Pedido sem pagamento online. Combine valores e entrega com a loja pelo WhatsApp.
        </p>
      </form>

      <div className="rounded-xl border border-border bg-card p-6 h-fit">
        <h3 className="font-display text-xl mb-4">Seu pedido</h3>
        <div className="space-y-3 text-sm">
          {items.length === 0 ? (
            <p className="text-muted-foreground">Carrinho vazio</p>
          ) : (
            items.map((i) => (
              <div key={i.product.id} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">
                    {i.qty}x {i.product.name}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0">{formatBRL(i.price * i.qty)}</span>
              </div>
            ))
          )}
        </div>
        <div className="my-4 gold-divider" />
        <div className="flex justify-between items-end">
          <span className="text-sm text-muted-foreground">Total estimado</span>
          <span className="font-display text-2xl text-gold">{formatBRL(total)}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          O valor final é confirmado pelo sistema no envio do pedido.
        </p>
      </div>

      <Dialog
        open={step !== "form"}
        onOpenChange={(open) => {
          if (!open && step !== "processing") setStep("form");
        }}
      >
        <DialogContent className="max-w-md">
          {step === "processing" && (
            <div className="py-10 flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-gold" />
              <p className="font-display text-xl">Enviando pedido...</p>
              <p className="text-sm text-muted-foreground">Aguarde a confirmação</p>
            </div>
          )}

          {step === "success" && order && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <DialogHeader>
                <DialogTitle>Pedido enviado com sucesso</DialogTitle>
                <DialogDescription>
                  Pedido aguardando confirmação. Combine o pagamento com a revendedora.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Pedido <span className="font-mono">{order.order_id.slice(0, 8)}</span>
                <br />
                Total: <span className="text-gold font-semibold">{formatBRL(order.total)}</span>
              </p>
              <div className="w-full space-y-2 pt-2">
                <Button onClick={sendWhatsApp} variant="whatsapp" size="lg" className="w-full">
                  <MessageCircle className="h-5 w-5" /> Enviar pedido pelo WhatsApp
                </Button>
                <Button onClick={finish} variant="outline" size="lg" className="w-full">
                  Voltar para a loja
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreCheckout;
