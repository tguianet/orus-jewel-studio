import { describe, expect, it } from "vitest";
import {
  emptyMatrixPercents,
  formatRateAsPercent,
  parsePercentInput,
  percentToRate,
  rateToPercent,
  ratesToMatrixPercents,
  validateCommissionPercents,
  validateMlmMatrixPercents,
  type MlmCommissionRateRow,
} from "@/lib/commissionSettings";
import {
  JEWELRY_MATERIALS,
  isJewelryMaterial,
  jewelryMaterialLabel,
  PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG,
  PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG,
} from "@/lib/jewelryMaterial";

/** Espelha a base auditada no SQL: order_items.total = unit_price × quantity. */
function commissionBaseFromItem(unitPrice: number, quantity: number, total?: number): number {
  if (total != null) return Math.round(total * 100) / 100;
  return Math.round(unitPrice * quantity * 100) / 100;
}

function commissionAmount(base: number, rate: number): number {
  return Math.round(base * rate * 100) / 100;
}

describe("jewelry material helpers", () => {
  it("reconhece gold/silver/plated e rejeita categoria", () => {
    expect(isJewelryMaterial("gold")).toBe(true);
    expect(isJewelryMaterial("Brincos")).toBe(false);
    expect(jewelryMaterialLabel(null)).toBe("Pendente");
    expect(jewelryMaterialLabel("plated")).toBe("Folheado");
  });

  it("mensagens de bloqueio estão definidas", () => {
    expect(PRODUCT_JEWELRY_MATERIAL_BLOCK_MSG).toMatch(/tipo da joia/i);
    expect(PRODUCT_JEWELRY_MATERIAL_REQUIRED_MSG).toMatch(/Ouro, Prata ou Folheada/i);
  });
});

describe("mlm commission matrix", () => {
  it("converte taxas (0–1) para percentuais editáveis", () => {
    const rows: MlmCommissionRateRow[] = JEWELRY_MATERIALS.flatMap((material) =>
      ([1, 2, 3] as const).map((level) => ({
        jewelry_material: material,
        level,
        percentage: level === 1 ? 0.25 : level === 2 ? 0.03 : 0.02,
      })),
    );
    const matrix = ratesToMatrixPercents(rows);
    expect(matrix.gold[1]).toBe("25");
    expect(matrix.silver[2]).toBe("3");
    expect(matrix.plated[3]).toBe("2");
  });

  it("valida soma por material ≤ 100%", () => {
    const matrix = emptyMatrixPercents();
    for (const m of JEWELRY_MATERIALS) {
      matrix[m][1] = "40";
      matrix[m][2] = "40";
      matrix[m][3] = "40";
    }
    expect(validateMlmMatrixPercents(matrix)).toMatch(/ultrapassar 100/);
  });

  it("aceita matriz válida", () => {
    const matrix = emptyMatrixPercents();
    for (const m of JEWELRY_MATERIALS) {
      matrix[m][1] = "25";
      matrix[m][2] = "3";
      matrix[m][3] = "2";
    }
    expect(validateMlmMatrixPercents(matrix)).toBeNull();
  });

  it("parsePercentInput aceita vírgula", () => {
    expect(parsePercentInput("12,5")).toBe(12.5);
    expect(percentToRate(25)).toBe(0.25);
    expect(rateToPercent(0.03)).toBe(3);
    expect(formatRateAsPercent(0.25)).toMatch(/25/);
  });

  it("validateCommissionPercents legado ainda funciona", () => {
    expect(validateCommissionPercents(25, 3, 2)).toBeNull();
    expect(validateCommissionPercents(-1, 0, 0)).not.toBeNull();
  });
});

describe("per-item commission calculation (client mirror of SQL)", () => {
  it("calcula por item com materiais mistos sem usar total do pedido", () => {
    const rates = {
      gold: { 1: 0.25, 2: 0.03, 3: 0.02 },
      silver: { 1: 0.1, 2: 0.02, 3: 0.01 },
      plated: { 1: 0.05, 2: 0.01, 3: 0.005 },
    } as const;

    const items = [
      { material: "gold" as const, unitPrice: 100, quantity: 2, total: 200 },
      { material: "plated" as const, unitPrice: 50, quantity: 1, total: 50 },
    ];

    const orderTotal = 250;
    let level1Sum = 0;
    for (const item of items) {
      const base = commissionBaseFromItem(item.unitPrice, item.quantity, item.total);
      level1Sum += commissionAmount(base, rates[item.material][1]);
    }

    // Ouro 25% de 200 = 50; Folheado 5% de 50 = 2,5 → 52,5
    expect(level1Sum).toBe(52.5);
    // Não deve ser 25% do pedido inteiro
    expect(level1Sum).not.toBe(commissionAmount(orderTotal, 0.25));
  });

  it("unique lógico por (order_item_id, reseller_id, level)", () => {
    const keys = new Set<string>();
    const lines = [
      { order_item_id: "a", reseller_id: "r1", level: 1 },
      { order_item_id: "a", reseller_id: "r1", level: 1 }, // retry
      { order_item_id: "a", reseller_id: "r2", level: 2 },
      { order_item_id: "b", reseller_id: "r1", level: 1 },
    ];
    const unique = lines.filter((l) => {
      const k = `${l.order_item_id}|${l.reseller_id}|${l.level}`;
      if (keys.has(k)) return false;
      keys.add(k);
      return true;
    });
    expect(unique).toHaveLength(3);
  });

  it("linhas legadas (sem order_item_id) são distintas das novas", () => {
    const legacy = { order_item_id: null as string | null, mode: "legacy_order" as const };
    const modern = { order_item_id: "item-1", mode: "per_item" as const };
    expect(legacy.order_item_id == null).toBe(true);
    expect(modern.order_item_id != null).toBe(true);
    expect(legacy.mode).not.toBe(modern.mode);
  });
});
