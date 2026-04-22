import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/lib/mockData";

export type CartItem = { product: Product; price: number; qty: number };

type Ctx = {
  items: CartItem[];
  add: (p: Product, price: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<Ctx | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (product: Product, price: number) => {
    setItems(prev => {
      const found = prev.find(i => i.product.id === product.id);
      if (found) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, price, qty: 1 }];
    });
  };
  const remove = (id: string) => setItems(prev => prev.filter(i => i.product.id !== id));
  const setQty = (id: string, qty: number) => setItems(prev => prev.map(i => i.product.id === id ? { ...i, qty: Math.max(1, qty) } : i));
  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return <CartContext.Provider value={{ items, add, remove, setQty, clear, total, count }}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
