import { describe, expect, it } from "vitest";
import {
  canExpireOrderRow,
  DEFAULT_RESERVE_MINUTES,
  displayOrderStatusLabel,
  formatCountdown,
  isExpiredOrder,
  isReservationExpiredByClock,
  isTerminalCheckoutTokenError,
  remainingSecondsUntil,
  translateExpirationReason,
} from "@/lib/orderExpiry";

describe("order reservation expiry helpers", () => {
  it("A/B — elegível new/confirmed vencido", () => {
    expect(canExpireOrderRow({
      status: "new",
      expires_at: "2026-07-26T00:00:00.000Z",
      expired_at: null,
      nowIso: "2026-07-26T01:00:00.000Z",
    })).toBe(true);
    expect(canExpireOrderRow({
      status: "confirmed",
      expires_at: "2026-07-26T00:00:00.000Z",
      expired_at: null,
      nowIso: "2026-07-26T01:00:00.000Z",
    })).toBe(true);
  });

  it("C — paid não expira", () => {
    expect(canExpireOrderRow({
      status: "paid",
      expires_at: "2026-07-26T00:00:00.000Z",
      expired_at: null,
      nowIso: "2026-07-26T01:00:00.000Z",
    })).toBe(false);
  });

  it("D — já expired_at: não elegível de novo", () => {
    expect(canExpireOrderRow({
      status: "cancelled",
      expires_at: "2026-07-26T00:00:00.000Z",
      expired_at: "2026-07-26T00:05:00.000Z",
      nowIso: "2026-07-26T01:00:00.000Z",
    })).toBe(false);
  });

  it("I — expires_at futuro permanece ativo", () => {
    expect(canExpireOrderRow({
      status: "new",
      expires_at: "2026-07-26T02:00:00.000Z",
      expired_at: null,
      nowIso: "2026-07-26T01:00:00.000Z",
    })).toBe(false);
    expect(isReservationExpiredByClock(
      "2026-07-26T02:00:00.000Z",
      Date.parse("2026-07-26T01:00:00.000Z"),
    )).toBe(false);
  });

  it("badge Expirado vs Cancelado", () => {
    const labels = { cancelled: "Cancelado", paid: "Pago" };
    expect(displayOrderStatusLabel({
      status: "cancelled",
      expired_at: "2026-07-26T00:05:00.000Z",
      expiration_reason: "abandoned_checkout_expired",
    }, labels)).toBe("Expirado");
    expect(displayOrderStatusLabel({
      status: "cancelled",
      expired_at: null,
    }, labels)).toBe("Cancelado");
    expect(isExpiredOrder({ expired_at: "x" })).toBe(true);
  });

  it("N — erro de token terminal", () => {
    expect(isTerminalCheckoutTokenError(
      "checkout_token já utilizado em pedido encerrado ou com reserva expirada. Gere um novo token",
    )).toBe(true);
    expect(isTerminalCheckoutTokenError("Estoque insuficiente")).toBe(false);
  });

  it("countdown e motivo", () => {
    expect(formatCountdown(125)).toBe("2:05");
    expect(remainingSecondsUntil(
      "2026-07-26T01:01:00.000Z",
      Date.parse("2026-07-26T01:00:00.000Z"),
    )).toBe(60);
    expect(translateExpirationReason("abandoned_checkout_expired")).toMatch(/expirada/i);
    expect(DEFAULT_RESERVE_MINUTES).toBe(60);
  });
});
