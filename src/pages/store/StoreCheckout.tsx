import { useOutletContext, useNavigate } from "react-router-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

type ConfirmedItem = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type OrderResult = {
  order_id: string;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
  items: ConfirmedItem[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function checkoutTokenKey(storeId: string) {
  return `orus_checkout_token:${storeId}`;
}

function checkoutCartKey(storeId: string) {
  return `orus_checkout_cart:${storeId}`;
}

function newCheckoutToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback RFC-like UUID v4 (sem crypto.randomUUID)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function cartFingerprint(items: { product: { id: string }; qty: number }[]): string {
  return items
    .map((i) => `${i.product.id}:${i.qty}`)
    .sort()
    .join("|");
}

function getOrCreateCheckoutToken(storeId: string, fingerprint: string): string {
  try {
    const prevCart = sessionStorage.getItem(checkoutCartKey(storeId));
    const existing = sessionStorage.getItem(checkoutTokenKey(storeId));
    // Carrinho mudou → novo token (evita reutilizar pedido antigo com itens diferentes)
    if (prevCart !== fingerprint) {
      const token = newCheckoutToken();
      sessionStorage.setItem(checkoutTokenKey(storeId), token);
      sessionStorage.setItem(checkoutCartKey(storeId), fingerprint);
      return token;
    }
    if (existing && UUID_RE.test(existing)) return existing;
  } catch {
    // sessionStorage indisponível
  }
  const token = newCheckoutToken();
  try {
    sessionStorage.setItem(checkoutTokenKey(storeId), token);
    sessionStorage.setItem(checkoutCartKey(storeId), fingerprint);
  } catch {
    // ignore
  }
  return token;
}

function clearCheckoutToken(storeId: string) {
  try {
    sessionStorage.removeItem(checkoutTokenKey(storeId));
    sessionStorage.removeItem(checkoutCartKey(storeId));
  } catch {
    // ignore
  }
}

function parseConfirmedItems(raw: unknown): ConfirmedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      product_id: (row.product_id as string | null) ?? null,
      product_name: String(row.product_name ?? ""),
      quantity: Number(row.quantity ?? 0),
      unit_price: Number(row.unit_price ?? 0),
      total: Number(row.total ?? 0),
    };
  });
}

const StoreCheckout = () => {
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const { items, total, clear } = useCart();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [step, setStep] = useState<Step>("form");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fingerprint = useMemo(() => cartFingerprint(items), [items]);

  // Se o carrinho mudar fora do submit, invalida token antigo desta loja.
  useEffect(() => {
    if (!store?.id) return;
    try {
      const prev = sessionStorage.getItem(checkoutCartKey(store.id));
      if (prev !== null && prev !== fingerprint) {
        clearCheckoutToken(store.id);
      }
    } catch {
      // ignore
    }
  }, [store?.id, fingerprint]);

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

    // Só product_id + quantity (sem preços/status). Token reutilizado no retry.
    const payloadItems = items.map((i) => ({
      product_id: i.product.id,
      quantity: i.qty,
    }));
    const checkoutToken = getOrCreateCheckoutToken(store.id, fingerprint);

    setSubmitting(true);
    setStep("processing");
    try {
      const { data, error } = await (supabase.rpc as any)("create_public_order", {
        p_seller_store_id: store.id,
        p_customer_name: form.name.trim(),
        p_customer_phone: form.phone.trim(),
        p_customer_address: form.address.trim() || null,
        p_notes: form.notes.trim() || null,
        p_items: payloadItems,
        p_checkout_token: checkoutToken,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.order_id) {
        throw new Error("Resposta inválida do servidor");
      }

      const confirmed: OrderResult = {
        order_id: row.order_id,
        status: row.status,
        subtotal: Number(row.subtotal),
        total: Number(row.total),
        created_at: row.created_at,
        items: parseConfirmedItems(row.items),
      };

      setOrder(confirmed);
      clear();
      clearCheckoutToken(store.id);
      setStep("success");
      toast.success("Pedido enviado com sucesso");
    } catch (err: unknown) {
      console.error("[checkout] erro ao criar pedido:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Não foi possível enviar o pedido";
      toast.error("Erro ao enviar pedido", { description: message });
      // Mantém o token para retry idempotente (não cria outro pedido)
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
      "*Itens (valores confirmados):*",
      ...order.items.map(
        (i) =>
          `• ${i.quantity}x ${i.product_name} — ${formatBRL(i.unit_price)} un. = ${formatBRL(i.total)}`,
      ),
      "",
      `*Total confirmado:* ${formatBRL(order.total)}`,
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
              <div className="w-full space-y-2 text-sm text-left">
                <p className="text-center text-muted-foreground">
                  Pedido <span className="font-mono">{order.order_id.slice(0, 8)}</span>
                </p>
                <div className="rounded-lg border border-border p-3 space-y-2">
                  {order.items.map((i, idx) => (
                    <div key={`${i.product_id ?? "item"}-${idx}`} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {i.quantity}x {i.product_name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{formatBRL(i.total)}</span>
                    </div>
                  ))}
                  <div className="gold-divider my-1" />
                  <div className="flex justify-between font-medium">
                    <span>Total confirmado</span>
                    <span className="text-gold">{formatBRL(order.total)}</span>
                  </div>
                </div>
              </div>
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
