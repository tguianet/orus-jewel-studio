import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

describe("legalVersioning", () => {
  it("migration define versão YYYY-MM-DD e protege content_hash", () => {
    const sql = readFileSync(
      path.join(root, "supabase/migrations/20260801120000_legal_consents.sql"),
      "utf8",
    );
    expect(sql).toContain("2026-07-26");
    expect(sql).toContain("protect_legal_document_hash");
    expect(sql).toContain("content_hash de documento publicado não pode ser alterado");
    expect(sql).toContain("uidx_legal_documents_one_active");
    expect(sql).toContain("publish_legal_document_version");
    expect(sql).toContain("p_consents");
    expect(sql).toContain("validate_checkout_consents");
  });

  it("create_public_order exige consentimentos na mesma transação", () => {
    const sql = readFileSync(
      path.join(root, "supabase/migrations/20260801120000_legal_consents.sql"),
      "utf8",
    );
    expect(sql).toContain("_record_checkout_consents_internal");
    expect(sql).toContain("Consentimentos legais são obrigatórios no checkout");
    expect(sql).toContain("ip_hash");
    expect(sql).toContain("user_agent_hash");
    expect(sql).toContain("_legal_hash");
  });
});
