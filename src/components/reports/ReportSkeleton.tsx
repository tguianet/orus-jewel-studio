export function ReportSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Carregando relatório">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  );
}
