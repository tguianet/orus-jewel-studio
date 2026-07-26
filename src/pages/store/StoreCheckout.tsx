import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import type { Sacoleira } from "@/types/commerce";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DEFAULT_RESERVE_MINUTES,
  formatCountdown,
  formatExpiresAt,
  isReservationExpiredByClock,
  isTerminalCheckoutTokenError,
  remainingSecondsUntil,
} from "@/lib/orderExpiry";
import { LEGAL_LINKS } from "@/lib/legalLinks";
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
  expires_at: string | null;
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fingerprint = useMemo(() => cartFingerprint(items), [items]);

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

  useEffect(() => {
    if (step !== "success" || !order?.expires_at) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step, order?.expires_at]);

  const countdownSecs = order?.expires_at
    ? remainingSecondsUntil(order.expires_at, nowMs)
    : null;
  const reservationExpiredUi = order?.expires_at
    ? isReservationExpiredByClock(order.expires_at, nowMs)
    : false;

  const submitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Aceite os Termos de Uso e a Política de Privacidade para continuar");
      return;
    }
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    const payloadItems = items.map((i) => ({
      product_id: i.product.id,
      quantity: i.qty,
    }));
    const checkoutToken = getOrCreateCheckoutToken(store.id, fingerprint);

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
        expires_at: row.expires_at ?? null,
        items: parseConfirmedItems(row.items),
      };

      setOrder(confirmed);
      setNowMs(Date.now());
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

      // Token terminal/expirado: limpa e gera novo na próxima tentativa
      if (isTerminalCheckoutTokenError(message)) {
        clearCheckoutToken(store.id);
        toast.error("Reserva expirada ou pedido encerrado", {
          description: "Seu carrinho foi mantido. Envie o pedido novamente para criar uma nova reserva.",
        });
      } else {
        toast.error("Erro ao enviar pedido", { description: message });
      }
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
      order.expires_at
        ? `*Reserva até:* ${formatExpiresAt(order.expires_at)}`
        : "",
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
      "_Após o prazo a reserva de estoque expira._",
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

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          O estoque ficará reservado por {DEFAULT_RESERVE_MINUTES} minutos após a criação do pedido.
          Depois disso a reserva expira e será necessário criar um novo pedido.
        </div>

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

          <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <Checkbox
              id="accept-legal"
              checked={acceptedTerms}
              onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
              disabled={submitting}
              className="mt-0.5"
            />
            <label htmlFor="accept-legal" className="text-sm leading-relaxed cursor-pointer">
              Li e concordo com os{" "}
              <Link
                to="/termos-de-uso"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                to="/politica-de-privacidade"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Política de Privacidade
              </Link>
              .
            </label>
          </div>
        </div>

        <nav aria-label="Políticas da loja" className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary underline-offset-2 hover:underline"
            >
              {link.shortLabel || link.label}
            </Link>
          ))}
        </nav>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || items.length === 0 || !acceptedTerms}
        >
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
                <DialogTitle>
                  {reservationExpiredUi ? "Reserva expirada" : "Pedido enviado com sucesso"}
                </DialogTitle>
                <DialogDescription>
                  {reservationExpiredUi
                    ? "O prazo de reserva acabou. Volte ao carrinho e envie um novo pedido para reservar o estoque novamente."
                    : "Pedido aguardando confirmação. Combine o pagamento com a revendedora."}
                </DialogDescription>
              </DialogHeader>
              <div className="w-full space-y-2 text-sm text-left">
                <p className="text-center text-muted-foreground">
                  Pedido <span className="font-mono">{order.order_id.slice(0, 8)}</span>
                </p>
                {order.expires_at ? (
                  <div className={`rounded-lg border px-3 py-2 text-center text-xs ${
                    reservationExpiredUi
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  }`}>
                    {reservationExpiredUi ? (
                      <p>Reserva expirada em {formatExpiresAt(order.expires_at)}</p>
                    ) : (
                      <>
                        <p>Estoque reservado até {formatExpiresAt(order.expires_at)}</p>
                        {countdownSecs != null ? (
                          <p className="mt-1 font-mono text-sm">Tempo restante: {formatCountdown(countdownSecs)}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
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
                {!reservationExpiredUi ? (
                  <Button onClick={sendWhatsApp} variant="whatsapp" size="lg" className="w-full">
                    <MessageCircle className="h-5 w-5" /> Enviar pedido pelo WhatsApp
                  </Button>
                ) : null}
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
