import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ReportTab } from "./reportTabConfig";

export type { ReportTab };

export function ReportTabs({ tabs }: { tabs: ReportTab[] }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 print:hidden" aria-label="Relatórios">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
