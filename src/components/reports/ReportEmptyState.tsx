export function ReportEmptyState({ title = "Sem dados", description = "Não há registros para o período selecionado." }: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
