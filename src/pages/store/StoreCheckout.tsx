import { useOutletContext, useNavigate } from "react-router-dom";
import { useState } from "react";

import { useCart } from "@/contexts/CartContext";
import { Sacoleira, formatBRL } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const StoreCheckout = () => {
  const { store } = useOutletContext<{ store: Sacoleira }>();
  const { items, total, clear } = useCart();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    const createOrder = async () => {
      const orderPayload: TablesInsert<"orders"> = {
        seller_store_id: store.id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address || null,
        notes: form.notes || null,
        subtotal: total,
        total,
        status: "new",
      };

      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (error || !order) throw error;

      const { error: itemsError } = await supabase.from("order_items").insert(items.map((i) => ({
        order_id: order.id,
        seller_store_id: store.id,
        product_id: /^[0-9a-f-]{36}$/i.test(i.product.id) ? i.product.id : null,
        product_name: i.product.name,
        quantity: i.qty,
        unit_price: i.price,
        total: i.price * i.qty,
      })));

      if (itemsError) throw itemsError;
      return order.id;
    };

    toast.promise(createOrder(), {
      loading: "Registrando pedido...",
      success: "Pedido registrado com sucesso!",
      error: "Não foi possível registrar o pedido.",
    });

    clear();
    setTimeout(() => nav(`/loja/${store.storeSlug}`), 1200);
  };

  return (
    <div className="container py-8 grid lg:grid-cols-3 gap-8 max-w-5xl">
      <form onSubmit={submitOrder} className="lg:col-span-2 space-y-4">
        <h1 className="font-display text-3xl mb-2">Finalizar pedido</h1>
        <p className="text-sm text-muted-foreground mb-6">Preencha seus dados para registrar seu pedido.</p>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div><Label>Nome completo *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1.5" /></div>
          <div><Label>WhatsApp *</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(11) 99999-9999" className="mt-1.5" /></div>
          <div><Label>Endereço de entrega</Label><Textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="mt-1.5" /></div>
          <div><Label>Observações do pedido</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5" /></div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Enviar pedido
        </Button>
        <p className="text-xs text-center text-muted-foreground">Seu pedido será enviado direto para {store.storeName}.</p>
      </form>

      <div className="rounded-xl border border-border bg-card p-6 h-fit">
        <h3 className="font-display text-xl mb-4">Seu pedido</h3>
        <div className="space-y-3 text-sm">
          {items.map(i => (
            <div key={i.product.id} className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate">{i.qty}x {i.product.name}</p>
              </div>
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
    </div>
  );
};

export default StoreCheckout;
