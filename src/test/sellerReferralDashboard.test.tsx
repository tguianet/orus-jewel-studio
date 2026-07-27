import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  buildReferralInviteMessage,
  buildReferralWhatsAppShareHref,
  isUuidLike,
  REFERRAL_CODE_MISSING_MESSAGE,
  REFERRAL_INVITE_SIGNUP_URL,
  resolveOwnReferralCode,
} from "@/lib/referralCode";

const authState = vi.hoisted(() => ({
  profile: {
    referralCode: "NPNCMF2L" as string | null,
    resellerId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" as string | null,
  },
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: authState.profile,
    loading: authState.loading,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { SellerReferralCodeCard } from "@/components/seller/SellerReferralCodeCard";
import { toast } from "sonner";

function renderCard() {
  return render(
    <MemoryRouter>
      <SellerReferralCodeCard />
    </MemoryRouter>,
  );
}

describe("referral dashboard — helpers", () => {
  it("não mostra UUID como código", () => {
    const uuid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(isUuidLike(uuid)).toBe(true);
    expect(resolveOwnReferralCode(uuid)).toBeNull();
    expect(resolveOwnReferralCode("NPNCMF2L")).toBe("NPNCMF2L");
    expect(resolveOwnReferralCode(" npncmf2l ")).toBe("NPNCMF2L");
    expect(resolveOwnReferralCode(null)).toBeNull();
  });

  it("compartilhar usa mensagem correta", () => {
    const msg = buildReferralInviteMessage("NPNCMF2L");
    expect(msg).toBe(
      "✨ Quero te convidar para fazer parte da minha rede Amada Amante!\n\n"
      + "Use meu código de indicação no cadastro:\n\n"
      + "NPNCMF2L\n\n"
      + "Cadastre-se em:\n"
      + REFERRAL_INVITE_SIGNUP_URL,
    );
    const href = buildReferralWhatsAppShareHref("NPNCMF2L");
    expect(href).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?text=/);
    const text = decodeURIComponent(String(href).split("text=")[1] || "");
    expect(text).toContain("NPNCMF2L");
    expect(text).toContain("https://amadaamante.app");
    expect(buildReferralInviteMessage(uuidLike())).toBe("");
  });
});

function uuidLike() {
  return "11111111-2222-4333-8444-555555555555";
}

describe("SellerReferralCodeCard", () => {
  beforeEach(() => {
    authState.profile = {
      referralCode: "NPNCMF2L",
      resellerId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    };
    authState.loading = false;
    vi.mocked(toast.success).mockClear();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("código aparece no dashboard", () => {
    renderCard();
    expect(screen.getByTestId("seller-referral-code-card")).toBeInTheDocument();
    expect(screen.getByText("Seu código de indicação")).toBeInTheDocument();
    expect(screen.getByTestId("seller-referral-code-value")).toHaveTextContent("NPNCMF2L");
  });

  it("copia corretamente somente o código", async () => {
    renderCard();
    fireEvent.click(screen.getByTestId("seller-referral-copy"));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("NPNCMF2L");
      expect(toast.success).toHaveBeenCalledWith("Código copiado com sucesso.");
    });
  });

  it("compartilhar usa mensagem correta", () => {
    renderCard();
    const share = screen.getByTestId("seller-referral-share").closest("a");
    expect(share?.getAttribute("href")).toContain("api.whatsapp.com");
    const text = decodeURIComponent(String(share?.getAttribute("href")).split("text=")[1] || "");
    expect(text).toContain("NPNCMF2L");
    expect(text).toContain("Amada Amante");
    expect(text).toContain("https://amadaamante.app");
  });

  it("botão abre Minha rede", () => {
    renderCard();
    const link = screen.getByTestId("seller-referral-network");
    expect(link).toHaveAttribute("href", "/sacoleira/rede");
    expect(link).toHaveTextContent("Ver minha rede");
  });

  it("loading", () => {
    authState.loading = true;
    renderCard();
    expect(screen.getByTestId("seller-referral-code-loading")).toHaveTextContent("Carregando");
    expect(screen.getByTestId("seller-referral-copy")).toBeDisabled();
  });

  it("código ausente", () => {
    authState.profile.referralCode = null;
    renderCard();
    expect(screen.getByTestId("seller-referral-code-missing")).toHaveTextContent(
      REFERRAL_CODE_MISSING_MESSAGE,
    );
    expect(screen.queryByTestId("seller-referral-code-value")).toBeNull();
    expect(screen.getByTestId("seller-referral-copy")).toBeDisabled();
  });

  it("não mostra UUID mesmo se referralCode viesse como UUID", () => {
    authState.profile.referralCode = authState.profile.resellerId;
    renderCard();
    expect(screen.queryByTestId("seller-referral-code-value")).toBeNull();
    expect(screen.getByTestId("seller-referral-code-missing")).toBeInTheDocument();
    expect(screen.queryByText(authState.profile.resellerId!)).toBeNull();
  });

  it("sacoleira vê apenas o próprio código (fonte AuthContext)", () => {
    authState.profile.referralCode = "MEUCOD01";
    renderCard();
    expect(screen.getByTestId("seller-referral-code-value")).toHaveTextContent("MEUCOD01");
    expect(screen.queryByText("NPNCMF2L")).toBeNull();
  });
});

describe("SellerDashboard — integração", () => {
  it("dashboard inclui o card de indicação", () => {
    const src = readFileSync(
      join(process.cwd(), "src/pages/seller/SellerDashboard.tsx"),
      "utf8",
    );
    expect(src).toContain("SellerReferralCodeCard");
    expect(src).not.toMatch(/referralCode\s*\|\|\s*profile\?\.resellerId/);
    expect(src).not.toMatch(/resellerId\s*\|\|\s*['"]/);
  });
});
