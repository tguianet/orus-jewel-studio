import { describe, expect, it } from "vitest";
import {
  decideReversalAction,
  formatReversalToast,
  isSafeUnpaidCancelStatus,
  shouldCreateAvailableDebit,
  toReversalAmount,
  viewAvailableAfter,
  type CommissionReversalSummary,
} from "@/lib/commissionReversal";

describe("commission reversal financial rules", () => {
  it("Cenário A — pending: cancela crédito, sem débito available, saldo 0", () => {
    const action = decideReversalAction({
      alreadyHasReversal: false,
      walletFound: true,
      walletStatus: "pending",
      commissionStatus: "pending",
    });
    expect(action).toBe("credit_cancelled");
    expect(shouldCreateAvailableDebit(action)).toBe(false);
    expect(viewAvailableAfter({
      originalWalletStatus: "pending",
      originalAmount: 25,
      action,
    })).toBe(0);
  });

  it("Cenário B — available: cancela crédito, sem débito available, saldo 0", () => {
    const action = decideReversalAction({
      alreadyHasReversal: false,
      walletFound: true,
      walletStatus: "available",
      commissionStatus: "available",
    });
    expect(action).toBe("credit_cancelled");
    expect(shouldCreateAvailableDebit(action)).toBe(false);
    expect(viewAvailableAfter({
      originalWalletStatus: "available",
      originalAmount: 25,
      action,
    })).toBe(0);
  });

  it("Cenário C — paid: preserva crédito e cria débito -25 available", () => {
    const action = decideReversalAction({
      alreadyHasReversal: false,
      walletFound: true,
      walletStatus: "paid",
      commissionStatus: "paid",
    });
    expect(action).toBe("paid_credit_preserved_and_debit_created");
    expect(shouldCreateAvailableDebit(action)).toBe(true);
    expect(toReversalAmount(25)).toBe(-25);
    expect(viewAvailableAfter({
      originalWalletStatus: "paid",
      originalAmount: 25,
      action,
    })).toBe(-25);
  });

  it("Cenário D — wallet inexistente + commission available: sem débito", () => {
    const action = decideReversalAction({
      alreadyHasReversal: false,
      walletFound: false,
      walletStatus: null,
      commissionStatus: "available",
    });
    expect(action).toBe("commission_cancelled_without_wallet");
    expect(shouldCreateAvailableDebit(action)).toBe(false);
  });

  it("Cenário E — wallet inexistente + commission paid: cria débito", () => {
    const action = decideReversalAction({
      alreadyHasReversal: false,
      walletFound: false,
      walletStatus: null,
      commissionStatus: "paid",
    });
    expect(action).toBe("paid_credit_preserved_and_debit_created");
    expect(shouldCreateAvailableDebit(action)).toBe(true);
  });

  it("Cenário F — segunda chamada: already_reversed, sem novo débito", () => {
    const action = decideReversalAction({
      alreadyHasReversal: true,
      walletFound: true,
      walletStatus: "paid",
      commissionStatus: "cancelled",
    });
    expect(action).toBe("already_reversed");
    expect(shouldCreateAvailableDebit(action)).toBe(false);

    const summary: CommissionReversalSummary = {
      order_id: "x",
      commissions_reversed: 0,
      wallet_reversals_created: 0,
      total_reversed: 0,
      already_reversed: true,
    };
    expect(formatReversalToast(summary)).toMatch(/já realizada/i);
    expect(formatReversalToast(summary)).not.toMatch(/R\$\s*30/);
  });

  it("Cenário G — comissões antigas usam amount original (não taxa atual)", () => {
    expect(toReversalAmount(10)).toBe(-10);
    expect(toReversalAmount(10)).not.toBe(-25);
  });

  it("toast não diz total estornado quando só cancelou créditos", () => {
    const summary: CommissionReversalSummary = {
      order_id: "x",
      commissions_reversed: 3,
      wallet_reversals_created: 0,
      total_reversed: 0,
      already_reversed: false,
    };
    const msg = formatReversalToast(summary);
    expect(msg).toMatch(/sem débito disponível/i);
    expect(msg).toMatch(/3 comissão/);
    expect(msg).not.toMatch(/total a compensar/);
  });

  it("toast mostra total a compensar só quando há débitos", () => {
    const summary: CommissionReversalSummary = {
      order_id: "x",
      commissions_reversed: 1,
      wallet_reversals_created: 1,
      total_reversed: 25,
      already_reversed: false,
    };
    expect(formatReversalToast(summary)).toMatch(/total a compensar/i);
  });

  it("pedido não pago: cancelamento direto permanece seguro no helper de UI", () => {
    expect(isSafeUnpaidCancelStatus("new")).toBe(true);
    expect(isSafeUnpaidCancelStatus("paid")).toBe(false);
  });
});
