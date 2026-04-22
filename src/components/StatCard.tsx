import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export const StatCard = ({ label, value, hint, icon: Icon, trend, className }: Props) => (
  <div className={cn("group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-500 hover:border-primary/40 hover:shadow-gold", className)}>
    <div className="absolute inset-0 bg-gradient-gold-soft opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="h-9 w-9 rounded-lg bg-gradient-gold-soft border border-primary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="font-display text-3xl font-semibold text-foreground">{value}</p>
      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && <span className="text-success font-medium">{trend}</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  </div>
);
