import { describe, expect, it } from "vitest";
import {
  isSafeReceiptUrl,
  maskBankAccount,
  maskDocument,
  maskPaymentDetails,
  maskPixKey,
} from "@/lib/withdrawalMasking";

describe("withdrawalMasking", () => {
  it("mascara documento e conta", () => {
    expect(maskDocument("12345678901")).toMatch(/\*\*\*/);
    expect(maskDocument("12345678901")).toContain("01");
    expect(maskBankAccount("123456-7")).toMatch(/••••/);
  });

  it("mascara chave PIX", () => {
    expect(maskPixKey("maria@email.com", "email")).toContain("@email.com");
    expect(maskPixKey("maria@email.com", "email")).not.toBe("maria@email.com");
    expect(maskPixKey("11999998888", "phone")).toMatch(/\*\*\*\*/);
    expect(maskPixKey("abcd-efgh-ijkl", "random")).toContain("…");
  });

  it("mascara payment details sem expor bruto", () => {
    const pix = maskPaymentDetails("pix", {
      pix_key_type: "email",
      pix_key: "secret@mail.com",
      account_holder_name: "Maria",
      account_holder_document: "12345678901",
    });
    expect(pix).toContain("PIX");
    expect(pix).not.toContain("secret@mail.com");
  });

  it("valida URL de comprovante", () => {
    expect(isSafeReceiptUrl("https://cdn.example.com/r.pdf")).toBe(true);
    expect(isSafeReceiptUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeReceiptUrl("data:text/html,hi")).toBe(false);
    expect(isSafeReceiptUrl("")).toBe(true);
  });
});
