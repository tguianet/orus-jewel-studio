import { formatBRL } from "@/lib/format";

type Point = { label: string; value: number };

export function SimpleLineChart({
  points,
  title = "Série",
  valueLabel = "Valor",
}: {
  points: Point[];
  title?: string;
  valueLabel?: string;
}) {
  if (!points.length) {
    return <p className="text-sm text-muted-foreground">Sem pontos no gráfico.</p>;
  }
  const w = 560;
  const h = 180;
  const pad = 28;
  const max = Math.max(...points.map((p) => p.value), 1);
  const coords = points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
    const y = h - pad - (p.value / max) * (h - pad * 2);
    return { ...p, x, y };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="mb-2 text-sm font-medium">{title}</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${title}. ${points.length} pontos.`}
        className="w-full h-auto"
      >
        <title>{title}</title>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity={0.2} />
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
        {coords.map((c) => (
          <circle key={c.label + c.x} cx={c.x} cy={c.y} r={3} fill="hsl(var(--primary))">
            <title>{`${c.label}: ${formatBRL(c.value)}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
          {valueLabel}
        </li>
        {points.slice(0, 6).map((p) => (
          <li key={p.label}>{p.label}: {formatBRL(p.value)}</li>
        ))}
      </ul>
    </figure>
  );
}

export function SimpleBarChart({
  points,
  title = "Barras",
}: {
  points: Point[];
  title?: string;
}) {
  if (!points.length) {
    return <p className="text-sm text-muted-foreground">Sem dados para barras.</p>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="mb-3 text-sm font-medium">{title}</figcaption>
      <ul className="space-y-2" aria-label={title}>
        {points.map((p) => (
          <li key={p.label} className="grid grid-cols-[100px_1fr_auto] items-center gap-2 text-xs">
            <span className="truncate text-muted-foreground">{p.label}</span>
            <div className="h-3 rounded bg-muted overflow-hidden" aria-hidden>
              <div
                className="h-full bg-primary/80"
                style={{ width: `${(p.value / max) * 100}%` }}
              />
            </div>
            <span className="tabular-nums">{formatBRL(p.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
