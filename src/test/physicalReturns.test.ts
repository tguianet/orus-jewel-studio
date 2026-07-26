import { describe, expect, it } from "vitest";
import {
  canRestockCondition,
  computeValueDifference,
  formatPhysicalReturnToast,
  isOrderStatusEligibleForReturnUi,
  requiresOpenPackageConfirmation,
  validateReturnItemDraft,
  type PhysicalReturnSummary,
} from "@/lib/physicalReturns";

describe("physical returns rules", () => {
  it("A/B/C — quantidades e restockável", () => {
    expect(validateReturnItemDraft({
      quantity: 3,
      remaining: 3,
      condition: "perfeito_estado",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
    })).toBeNull();

    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 3,
      condition: "perfeito_estado",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
    })).toBeNull();

    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 2,
      condition: "perfeito_estado",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
    })).toBeNull();
  });

  it("D — quantidade acima do restante", () => {
    expect(validateReturnItemDraft({
      quantity: 2,
      remaining: 1,
      condition: "perfeito_estado",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
    })).toMatch(/acima do restante/i);
  });

  it("E — avariado tentando restock", () => {
    expect(canRestockCondition("avariado")).toBe(false);
    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 1,
      condition: "avariado",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
    })).toMatch(/não permite retornar/i);
  });

  it("F/G — embalagem aberta exige confirmação", () => {
    expect(requiresOpenPackageConfirmation("embalagem_aberta", "retornar_ao_estoque")).toBe(true);
    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 1,
      condition: "embalagem_aberta",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
      confirm_open_package_restock: false,
    })).toMatch(/inspeção/i);

    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 1,
      condition: "embalagem_aberta",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
      confirm_open_package_restock: true,
    })).toBeNull();
  });

  it("H — double submit lógico: restante 0 bloqueia", () => {
    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 0,
      condition: "perfeito_estado",
      stock_action: "retornar_ao_estoque",
      resolution: "devolucao",
    })).toMatch(/acima do restante/i);
  });

  it("O — troca calcula pendência e exige substituto", () => {
    expect(computeValueDifference(1, 100, 1, 120)).toBe(20);
    expect(computeValueDifference(1, 100, 1, 80)).toBe(-20);
    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 1,
      condition: "perfeito_estado",
      stock_action: "nao_retornar_ao_estoque",
      resolution: "troca",
    })).toMatch(/substituto/i);
    expect(validateReturnItemDraft({
      quantity: 1,
      remaining: 1,
      condition: "perfeito_estado",
      stock_action: "nao_retornar_ao_estoque",
      resolution: "troca",
      replacement_product_id: "prod-2",
      replacement_quantity: 1,
    })).toBeNull();
  });

  it("elegibilidade de status na UI", () => {
    expect(isOrderStatusEligibleForReturnUi("shipped")).toBe(true);
    expect(isOrderStatusEligibleForReturnUi("delivered")).toBe(true);
    expect(isOrderStatusEligibleForReturnUi("paid")).toBe(true);
    expect(isOrderStatusEligibleForReturnUi("refunded")).toBe(true);
    expect(isOrderStatusEligibleForReturnUi("cancelled")).toBe(true);
    expect(isOrderStatusEligibleForReturnUi("new")).toBe(false);
    expect(isOrderStatusEligibleForReturnUi("confirmed")).toBe(false);
  });

  it("toast resume restock e pendência", () => {
    const summary: PhysicalReturnSummary = {
      return_id: "r1",
      order_id: "o1",
      items_count: 2,
      units_returned: 2,
      units_restocked: 1,
      units_not_restocked: 1,
      financial_pending_amount: 15,
    };
    const msg = formatPhysicalReturnToast(summary);
    expect(msg).toMatch(/2 unidade/);
    expect(msg).toMatch(/1 ao estoque/);
    expect(msg).toMatch(/pendência/);
  });
});
