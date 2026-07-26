import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimpleBarChart, SimpleLineChart } from "@/components/reports/SimpleCharts";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";

describe("reportCharts", () => {
  it("gráfico de linha é acessível", () => {
    render(
      <SimpleLineChart
        title="Vendas"
        points={[
          { label: "01/08", value: 10 },
          { label: "02/08", value: 20 },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: /Vendas/i })).toBeTruthy();
  });

  it("barras listam valores", () => {
    render(<SimpleBarChart title="Status" points={[{ label: "paid", value: 100 }]} />);
    expect(screen.getByLabelText("Status")).toBeTruthy();
    expect(screen.getByText(/paid/i)).toBeTruthy();
  });

  it("estados vazio/loading/erro", () => {
    const { rerender } = render(<ReportEmptyState />);
    expect(screen.getByText(/Sem dados/i)).toBeTruthy();
    rerender(<ReportSkeleton />);
    expect(screen.getByLabelText(/Carregando relatório/i)).toBeTruthy();
    rerender(<ReportErrorState message="Falha" correlationId="op_20260803_abcd1234" />);
    expect(screen.getByText("Falha")).toBeTruthy();
    expect(screen.getByText(/op_20260803_abcd1234/)).toBeTruthy();
  });
});
