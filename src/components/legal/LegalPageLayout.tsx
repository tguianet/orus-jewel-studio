import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { OrusLogo } from "@/components/OrusLogo";
import { Button } from "@/components/ui/button";
import { LEGAL_LAST_UPDATED, LEGAL_LINKS } from "@/lib/legalLinks";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type Props = {
  title: string;
  description: string;
  sections: LegalSection[];
};

export function LegalPageLayout({ title, description, sections }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-gradient-radial-gold opacity-40" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <OrusLogo size="sm" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container relative py-10 sm:py-14 max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Amada Amante</p>
        <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight mb-3">{title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-2">{description}</p>
        <p className="text-xs text-muted-foreground mb-8">
          Última atualização: {LEGAL_LAST_UPDATED}
        </p>

        <nav
          aria-label="Sumário"
          className="mb-10 rounded-xl border border-border/70 bg-card/60 p-5"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Sumário</p>
          <ol className="space-y-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-foreground/90 hover:text-primary transition-colors"
                >
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-light mb-3">
                {i + 1}. {s.title}
              </h2>
              <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-foreground/90">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-border/60">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Outras políticas
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-primary hover:underline underline-offset-4"
              >
                {link.shortLabel || link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <footer className="border-t border-border/50 py-8 mt-8">
        <div className="container text-center space-y-2">
          <p className="font-display text-lg tracking-[0.2em] text-gold uppercase font-light">
            Amada Amante
          </p>
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Amada Amante — todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
