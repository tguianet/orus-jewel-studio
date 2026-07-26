import { describe, expect, it } from "vitest";
import {
  canAdminApprove,
  canAdminPay,
  canAdminReject,
  canSellerCancel,
  canTransitionWithdrawal,
  isTerminalWithdrawalStatus,
} from "@/lib/withdrawalStatus";

describe("withdrawalStatus", () => {
  it("transições permitidas", () => {
    expect(canTransitionWithdrawal("pending", "approved")).toBe(true);
    expect(canTransitionWithdrawal("pending", "rejected")).toBe(true);
    expect(canTransitionWithdrawal("pending", "cancelled")).toBe(true);
    expect(canTransitionWithdrawal("approved", "paid")).toBe(true);
    expect(canTransitionWithdrawal("approved", "rejected")).toBe(true);
    expect(canTransitionWithdrawal("pending", "paid")).toBe(false);
    expect(canTransitionWithdrawal("paid", "approved")).toBe(false);
    expect(canTransitionWithdrawal("rejected", "approved")).toBe(false);
    expect(canTransitionWithdrawal("cancelled", "approved")).toBe(false);
  });

  it("botões por status", () => {
    expect(canSellerCancel("pending")).toBe(true);
    expect(canSellerCancel("approved")).toBe(false);
    expect(canAdminApprove("pending")).toBe(true);
    expect(canAdminReject("approved")).toBe(true);
    expect(canAdminPay("approved")).toBe(true);
    expect(canAdminPay("pending")).toBe(false);
    expect(isTerminalWithdrawalStatus("paid")).toBe(true);
    expect(isTerminalWithdrawalStatus("pending")).toBe(false);
  });
});
