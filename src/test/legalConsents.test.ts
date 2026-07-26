import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isPathAllowedForRole } from "@/lib/safeRedirect";
import { friendlyLegalError } from "@/lib/legalConsents";

const root = path.resolve(__dirname, "../..");

describe("legalConsents", () => {
  it("rotas por perfil", () => {
    expect(isPathAllowedForRole("/sacoleira/consentimentos", ["sacoleira"])).toBe(true);
    expect(isPathAllowedForRole("/admin/consentimentos", ["admin"])).toBe(true);
    expect(isPathAllowedForRole("/admin/documentos-legais", ["admin"])).toBe(true);
    expect(isPathAllowedForRole("/admin/consentimentos", ["sacoleira"])).toBe(false);

    const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(app).toContain("/sacoleira/consentimentos");
    expect(app).toContain("/admin/documentos-legais");
    expect(app).toContain("/admin/consentimentos");
  });

  it("erro amigável e sacoleira tem página própria", () => {
    expect(friendlyLegalError("Os termos foram atualizados. Revise e aceite novamente.")).toContain(
      "atualizados",
    );
    const seller = readFileSync(path.join(root, "src/pages/seller/SellerLegalConsents.tsx"), "utf8");
    expect(seller).toContain("fetchMyConsents");
    expect(seller).toContain("recordAuthenticatedConsent");
  });

  it("admin publica nova versão", () => {
    const admin = readFileSync(path.join(root, "src/pages/admin/AdminLegalDocuments.tsx"), "utf8");
    expect(admin).toContain("publishLegalDocumentVersion");
    expect(admin).toContain("YYYY-MM-DD");
  });
});
