import { useOutletContext, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MessageCircle, QrCode, CreditCard, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Sacoleira, formatBRL } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type Step = "form" | "payment" | "processing" | "success";

const fakePixCode = "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925LOJA SIMULADA AURA JOIAS6009SAO PAULO62070503***6304ABCD";

const StoreCheckout = () => {
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const { items, total, clear } = useCart();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [orderId, setOrderId] = useState<string | null>(null);

  const goToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }
    setStep("payment");
  };

  const createOrder = async (paymentMethod: "pix" | "card") => {
    const newOrderId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const orderPayload: TablesInsert<"orders"> = {
      id: newOrderId,
      seller_store_id: store.id,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_address: form.address || null,
      notes: `[Pagamento simulado: ${paymentMethod.toUpperCase()}]${form.notes ? " " + form.notes : ""}`,
      subtotal: total,
      total,
      status: "paid",
    };
    const { error } = await supabase.from("orders").insert(orderPayload);
    if (error) throw error;
    const candidateIds = items
      .map((i) => i.product.id)
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    let validIds = new Set<string>();
    if (candidateIds.length > 0) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .in("id", candidateIds);
      validIds = new Set((existing ?? []).map((p) => p.id));
    }
    const { error: itemsError } = await supabase.from("order_items").insert(items.map((i) => ({
      order_id: newOrderId,
      seller_store_id: store.id,
      product_id: validIds.has(i.product.id) ? i.product.id : null,
      product_name: i.product.name,
      quantity: i.qty,
      unit_price: i.price,
      total: i.price * i.qty,
    })));
    if (itemsError) throw itemsError;
    return newOrderId;
  };

  const handlePay = async () => {
    if (method === "card") {
      if (!card.number.replace(/\s/g, "")) {
        toast.error("Digite um número de cartão para simular");
        return;
      }
    }
    setStep("processing");
    try {
      // Simulate payment processing delay
      await new Promise((r) => setTimeout(r, 2200));
      const id = await createOrder(method);
      setOrderId(id);
      setStep("success");
    } catch (err: any) {
      console.error("[checkout] erro ao registrar pagamento:", err);
      toast.error(`Erro ao registrar pagamento: ${err?.message ?? "desconhecido"}`);
      setStep("payment");
    }
  };

  const sendWhatsApp = () => {
    const lines = [
      `*Pedido pago — ${store.storeName}*`,
      "",
      `*Cliente:* ${form.name}`,
      `*WhatsApp:* ${form.phone}`,
      form.address ? `*Endereço:* ${form.address}` : "",
      form.notes ? `*Obs:* ${form.notes}` : "",
      `*Pagamento:* ${method === "pix" ? "Pix (simulado)" : "Cartão (simulado)"}`,
      orderId ? `*Pedido:* ${orderId.slice(0, 8)}` : "",
      "",
      "*Itens:*",
      ...items.map(i => `• ${i.qty}x ${i.product.name} — ${formatBRL(i.price * i.qty)}`),
      "",
      `*Total pago:* ${formatBRL(total)}`,
    ].filter(Boolean).join("\n");
    const phone = store.phone.replace(/\D/g, "");
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(lines)}`, "_blank", "noopener,noreferrer");
  };

  const finish = () => {
    clear();
    nav(`/loja/${store.storeSlug}`);
  };

  const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <div className="container py-8 grid lg:grid-cols-3 gap-8 max-w-5xl">
      <form onSubmit={goToPayment} className="lg:col-span-2 space-y-4">
        <h1 className="font-display text-3xl mb-2">Finalizar pedido</h1>
        <p className="text-sm text-muted-foreground mb-6">Preencha seus dados e siga para o pagamento.</p>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div><Label>Nome completo *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1.5" /></div>
          <div><Label>WhatsApp *</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(11) 99999-9999" className="mt-1.5" /></div>
          <div><Label>Endereço de entrega</Label><Textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="mt-1.5" /></div>
          <div><Label>Observações do pedido</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" /></div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Ir para pagamento — {formatBRL(total)}
        </Button>
        <p className="text-xs text-center text-muted-foreground">Pagamento simulado para testes (Pix e Cartão).</p>
      </form>

      <div className="rounded-xl border border-border bg-card p-6 h-fit">
        <h3 className="font-display text-xl mb-4">Seu pedido</h3>
        <div className="space-y-3 text-sm">
          {items.map(i => (
            <div key={i.product.id} className="flex justify-between gap-3">
              <div className="min-w-0"><p className="truncate">{i.qty}x {i.product.name}</p></div>
              <span className="text-muted-foreground shrink-0">{formatBRL(i.price * i.qty)}</span>
            </div>
          ))}
        </div>
        <div className="my-4 gold-divider" />
        <div className="flex justify-between items-end">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-2xl text-gold">{formatBRL(total)}</span>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog open={step !== "form"} onOpenChange={(open) => { if (!open && step !== "processing") setStep("form"); }}>
        <DialogContent className="max-w-md">
          {step === "payment" && (
            <>
              <DialogHeader>
                <DialogTitle>Pagamento</DialogTitle>
                <DialogDescription>
                  Total a pagar: <span className="text-gold font-semibold">{formatBRL(total)}</span> · Modo de teste
                </DialogDescription>
              </DialogHeader>
              <Tabs value={method} onValueChange={(v) => setMethod(v as "pix" | "card")} className="mt-2">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="pix"><QrCode className="h-4 w-4 mr-2" />Pix</TabsTrigger>
                  <TabsTrigger value="card"><CreditCard className="h-4 w-4 mr-2" />Cartão</TabsTrigger>
                </TabsList>
                <TabsContent value="pix" className="space-y-4 pt-4">
                  <div className="flex justify-center">
                    <img
                      alt="QR Code Pix simulado"
                      className="rounded-lg border border-border bg-white p-2"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fakePixCode)}`}
                      width={200}
                      height={200}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pix copia e cola (simulado)</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input readOnly value={fakePixCode} className="text-xs font-mono" />
                      <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(fakePixCode); toast.success("Código copiado"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Ambiente de teste — nenhum valor real será cobrado.</p>
                </TabsContent>
                <TabsContent value="card" className="space-y-3 pt-4">
                  <div>
                    <Label>Número do cartão</Label>
                    <Input value={card.number} onChange={e => setCard({...card, number: formatCardNumber(e.target.value)})} placeholder="4111 1111 1111 1111" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Nome impresso no cartão</Label>
                    <Input value={card.name} onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} placeholder="NOME COMPLETO" className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Validade</Label>
                      <Input value={card.expiry} onChange={e => setCard({...card, expiry: formatExpiry(e.target.value)})} placeholder="MM/AA" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4)})} placeholder="123" className="mt-1.5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Não use cartão real. Qualquer dado funciona neste teste.</p>
                </TabsContent>
              </Tabs>
              <Button onClick={handlePay} size="lg" className="w-full mt-2">
                Pagar {formatBRL(total)}
              </Button>
            </>
          )}

          {step === "processing" && (
            <div className="py-10 flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-gold" />
              <p className="font-display text-xl">Processando pagamento...</p>
              <p className="text-sm text-muted-foreground">Aguarde a confirmação</p>
            </div>
          )}

          {step === "success" && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <DialogTitle>Pagamento aprovado!</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Pedido <span className="font-mono">{orderId?.slice(0, 8)}</span> registrado com sucesso.<br />
                Valor: <span className="text-gold font-semibold">{formatBRL(total)}</span>
              </p>
              <div className="w-full space-y-2 pt-2">
                <Button onClick={sendWhatsApp} variant="whatsapp" size="lg" className="w-full">
                  <MessageCircle className="h-5 w-5" /> Avisar a loja pelo WhatsApp
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
