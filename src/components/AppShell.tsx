import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon, Menu, X, LogOut } from "lucide-react";
import { OrusLogo } from "./OrusLogo";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";

export type NavItem = { label: string; to: string; icon: LucideIcon };

interface Props {
  nav: NavItem[];
  scopeLabel: string;
  userName: string;
  children: ReactNode;
}

export const AppShell = ({ nav, scopeLabel, userName, children }: Props) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const auth = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-72 shrink-0 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-sidebar-border">
            <OrusLogo />
            <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-primary/70">{scopeLabel}</p>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-300",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                  <span className="font-medium">{item.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-glow" />}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-medium text-sm">
                {userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{scopeLabel}</p>
              </div>
            </div>
            <Link to="/" onClick={() => auth.signOut()}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden" />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 border-b border-border bg-background/90 backdrop-blur-md">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <OrusLogo size="sm" />
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};
