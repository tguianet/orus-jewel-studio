import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AppError,
  __resetAppErrorToastDedupeForTests,
  createCorrelationId,
  decideRetry,
  normalizeError,
  showAppError,
  toReportable,
} from "@/lib/errors";
import { assertOnlineForCritical } from "@/lib/networkStatus";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("operation error flow", () => {
  beforeEach(() => {
    __resetAppErrorToastDedupeForTests();
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("M — offline bloqueia operação crítica", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    expect(() => assertOnlineForCritical("create_public_order")).toThrow(AppError);
    try {
      assertOnlineForCritical("create_public_order");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("NETWORK_OFFLINE");
    }
  });

  it("P — duplo toast é deduplicado", () => {
    const err = new AppError({
      code: "CHECKOUT_FAILED",
      correlationId: createCorrelationId(),
    });
    showAppError(err, { report: false });
    showAppError(err, { report: false });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("checkout não tem retry automático mesmo com 503", () => {
    expect(decideRetry({
      operation: "create_public_order",
      attempt: 1,
      httpStatus: 503,
    }).shouldRetry).toBe(false);
  });

  it("termos atualizados no checkout", () => {
    const err = normalizeError(new Error("Os termos foram atualizados"), {
      operation: "create_public_order",
    });
    expect(err.code).toBe("CHECKOUT_TERMS_UPDATED");
  });

  it("reporter não inclui payload bruto de checkout", () => {
    const err = new AppError({
      code: "CHECKOUT_FAILED",
      metadata: {
        customer_name: "Ana",
        customer_address: "Rua X",
        payment_details: { pix: "1" },
        order_id: "44444444-4444-4444-4444-444444444444",
      },
    });
    const json = JSON.stringify(toReportable(err));
    expect(json).not.toContain("Ana");
    expect(json).not.toContain("Rua X");
    expect(json).toContain("44444444-4444-4444-4444-444444444444");
  });
});
