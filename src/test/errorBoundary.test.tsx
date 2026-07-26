import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteErrorBoundary } from "@/components/errors/RouteErrorBoundary";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("render boom");
}

function Safe({ label }: { label: string }) {
  return <div>{label}</div>;
}

describe("Error boundaries", () => {
  it("N/O — ErrorBoundary mostra fallback com código de suporte", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <RouteErrorBoundary name="test-route">
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText(/Falha nesta página/i)).toBeTruthy();
    expect(screen.getByText(/Código de suporte:/i)).toBeTruthy();
    vi.restoreAllMocks();
  });

  it("T — erro em rota não derruba app inteiro", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <div>
          <Safe label="menu-ok" />
          <RouteErrorBoundary name="isolated">
            <Boom />
          </RouteErrorBoundary>
        </div>
      </AppErrorBoundary>,
    );
    expect(screen.getByText("menu-ok")).toBeTruthy();
    expect(screen.getByText(/Falha nesta página/i)).toBeTruthy();
    vi.restoreAllMocks();
  });
});
