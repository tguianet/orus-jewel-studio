import { describe, expect, it } from "vitest";
import {
  assertNotDirectCancelledStatus,
  computeRemainingToRestore,
  formatStockCancelToast,
  isStockCancelEligibleStatus,
  shouldHideCancelledInStatusSelect,
  type CancelOrderWithStockSummary,
} from "@/lib/orderCancel";

describe("liquid cancel restore rules", () => {
  it("A — sem devolução: remaining = purchased", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 3,
      qtyPhysicallyReturned: 0,
      qtyCancelRestored: 0,
    })).toBe(3);
  });

  it("B — devolução com restock 1: remaining 2", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 3,
      qtyPhysicallyReturned: 1,
      qtyCancelRestored: 0,
    })).toBe(2);
  });

  it("C — devolução total: remaining 0", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 3,
      qtyPhysicallyReturned: 3,
      qtyCancelRestored: 0,
    })).toBe(0);
  });

  it("D — avariado sem restock conta como devolvido fisicamente", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 3,
      qtyPhysicallyReturned: 1,
      qtyCancelRestored: 0,
    })).toBe(2);
  });

  it("E — mesmo produto duas linhas agregadas (2+1)", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 2 + 1,
      qtyPhysicallyReturned: 0,
      qtyCancelRestored: 0,
    })).toBe(3);
  });

  it("F — segunda chamada: cancel_restore já cobre remaining", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 3,
      qtyPhysicallyReturned: 1,
      qtyCancelRestored: 2,
    })).toBe(0);
  });

  it("nunca negativo", () => {
    expect(computeRemainingToRestore({
      qtyPurchased: 3,
      qtyPhysicallyReturned: 2,
      qtyCancelRestored: 2,
    })).toBe(0);
  });

  it("K — paid não é elegível ao cancel com restore", () => {
    expect(isStockCancelEligibleStatus("paid")).toBe(false);
    expect(isStockCancelEligibleStatus("shipped")).toBe(true);
    expect(isStockCancelEligibleStatus("delivered")).toBe(true);
  });

  it("Select esconde cancelled nos status elegíveis e pagos", () => {
    expect(shouldHideCancelledInStatusSelect("new")).toBe(true);
    expect(shouldHideCancelledInStatusSelect("shipped")).toBe(true);
    expect(shouldHideCancelledInStatusSelect("paid")).toBe(true);
  });

  it("N — updateOrderStatus cancelled é bloqueado no helper", () => {
    expect(() => assertNotDirectCancelledStatus("cancelled")).toThrow(/depreciado/i);
    expect(() => assertNotDirectCancelledStatus("shipped")).not.toThrow();
  });

  it("toast resume restore", () => {
    const summary: CancelOrderWithStockSummary = {
      order_id: "o1",
      units_restored: 2,
      products_touched: 1,
      skipped_zero: 1,
      details: [],
    };
    expect(formatStockCancelToast(summary)).toMatch(/2 unidade/);
    expect(formatStockCancelToast(summary)).toMatch(/sem restante/);
  });
});
