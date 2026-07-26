import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCheckoutConsentPayload,
  reconcileAcceptedWithDocs,
} from "@/lib/legalConsents";
import type { LegalDocument } from "@/types/legal";

const root = path.resolve(__dirname, "../..");

const doc = (
  type: LegalDocument["document_type"],
  version: string,
  hash: string,
): LegalDocument => ({
  id: type,
  document_type: type,
  title: type,
  version,
  content_hash: hash,
  effective_at: "2026-07-26",
  route_path: "/",
  requires_acceptance: true,
  audience: "customer",
});

describe("checkoutLegalConsent", () => {
  it("payload envia type + version + hash + accepted", () => {
    const docs = [
      doc("privacy_policy", "2026-07-26", "h1"),
      doc("terms_of_use", "2026-07-26", "h2"),
      doc("returns_policy", "2026-07-26", "h3"),
      doc("delivery_policy", "2026-07-26", "h4"),
    ];
    const payload = buildCheckoutConsentPayload(
      docs,
      new Set(["privacy_policy", "terms_of_use", "returns_policy", "delivery_policy"]),
    );
    expect(payload).toHaveLength(4);
    expect(payload[0]).toMatchObject({
      document_type: "privacy_policy",
      version: "2026-07-26",
      content_hash: "h1",
      accepted: true,
    });

    const checkout = readFileSync(path.join(root, "src/pages/store/StoreCheckout.tsx"), "utf8");
    expect(checkout).toContain("p_consents");
    expect(checkout).toContain("buildCheckoutConsentPayload");
  });

  it("mudança de versão invalida aceite anterior no formulário", () => {
    const prev = [doc("privacy_policy", "2026-07-26", "h1")];
    const next = [doc("privacy_policy", "2026-08-01", "h2")];
    const kept = reconcileAcceptedWithDocs(new Set(["privacy_policy"]), prev, next);
    expect(kept.has("privacy_policy")).toBe(false);

    const same = reconcileAcceptedWithDocs(new Set(["privacy_policy"]), prev, prev);
    expect(same.has("privacy_policy")).toBe(true);
  });
});
