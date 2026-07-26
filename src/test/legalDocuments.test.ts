import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CHECKOUT_REQUIRED_DOCUMENT_TYPES } from "@/types/legal";
import { isCheckoutConsentComplete } from "@/lib/legalConsents";
import type { LegalDocument } from "@/types/legal";

const root = path.resolve(__dirname, "../..");

const sampleDocs = (): LegalDocument[] =>
  CHECKOUT_REQUIRED_DOCUMENT_TYPES.map((document_type, i) => ({
    id: `id-${i}`,
    document_type,
    title: document_type,
    version: "2026-07-26",
    content_hash: `hash-${document_type}`,
    effective_at: "2026-07-26T00:00:00Z",
    route_path: "/x",
    requires_acceptance: true,
    audience: "customer",
  }));

describe("legalDocuments", () => {
  it("documentos obrigatórios de checkout definidos sem hashes hardcoded na UI", () => {
    expect(CHECKOUT_REQUIRED_DOCUMENT_TYPES).toContain("privacy_policy");
    expect(CHECKOUT_REQUIRED_DOCUMENT_TYPES).toContain("terms_of_use");
    expect(CHECKOUT_REQUIRED_DOCUMENT_TYPES).toContain("returns_policy");
    expect(CHECKOUT_REQUIRED_DOCUMENT_TYPES).toContain("delivery_policy");

    const checkout = readFileSync(path.join(root, "src/pages/store/StoreCheckout.tsx"), "utf8");
    expect(checkout).toContain("fetchActiveLegalDocuments");
    expect(checkout).not.toMatch(/content_hash:\s*["'][a-f0-9]{64}/);
  });

  it("exige aceite de todos os obrigatórios", () => {
    const docs = sampleDocs();
    expect(isCheckoutConsentComplete(docs, new Set())).toBe(false);
    expect(
      isCheckoutConsentComplete(
        docs,
        new Set(["privacy_policy", "terms_of_use", "returns_policy"]),
      ),
    ).toBe(false);
    expect(
      isCheckoutConsentComplete(docs, new Set(CHECKOUT_REQUIRED_DOCUMENT_TYPES)),
    ).toBe(true);
  });
});
