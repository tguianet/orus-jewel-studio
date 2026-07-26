import { Button } from "@/components/ui/button";

export function ReportPrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="print:hidden"
      onClick={() => window.print()}
    >
      {label}
    </Button>
  );
}
