import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ChooseAreaPage", () => {
  const page = readFileSync(join(process.cwd(), "src/pages/ChooseAreaPage.tsx"), "utf8");
  const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");

  it("rota /escolher-area existe", () => {
    expect(app).toContain('path="/escolher-area"');
    expect(app).toContain("ChooseAreaPage");
  });

  it("mostra escolha e botões das duas áreas", () => {
    expect(page).toContain("Como deseja entrar?");
    expect(page).toContain("Painel Administrativo");
    expect(page).toContain("Minha área de Sacoleira");
    expect(page).toContain('navigate("/admin"');
    expect(page).toContain('navigate("/sacoleira"');
  });

  it("salva preferência sem alterar role", () => {
    expect(page).toContain("writeAreaPreference");
    expect(page).toContain('writeAreaPreference("admin")');
    expect(page).toContain('writeAreaPreference("reseller")');
    expect(page).not.toContain('from("user_roles")');
    expect(page).not.toContain("admin_grant");
  });

  it("só usuários com duas roles permanecem na tela", () => {
    expect(page).toContain("isAdmin && isReseller");
    expect(page).toContain("fallbackPathForRoles");
  });
});
