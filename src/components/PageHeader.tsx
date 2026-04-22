import { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ eyebrow, title, description, actions }: Props) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{eyebrow}</p>}
      <h1 className="font-display text-3xl sm:text-4xl font-light text-foreground">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
