import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Store, Crown, Gem, ShieldCheck, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrusLogo } from "@/components/OrusLogo";
import heroImg from "@/assets/hero-jewelry.jpg";
import { supabase } from "@/integrations/supabase/client";
import { commissionRules } from "@/lib/commissionRules";

const features = [
  { icon: Store, title: "Lojas para sacoleiras", text: "Cada revendedora ganha uma loja própria com URL personalizada, catálogo e identidade visual." },
  { icon: Network, title: "Marketing multinível", text: "Monte redes de indicação em até 3 níveis, com comissões rastreadas por venda de produto." },
  { icon: Gem, title: "Catálogo de joias", text: "A sacoleira escolhe produtos do atacado, define preço de revenda e monta sua vitrine." },
  { icon: ShieldCheck, title: "Multi-tenant seguro", text: "Dados, pedidos e produtos de cada loja ficam isolados por revendedora." },
];

const Landing = () => {
  const [activeSellers, setActiveSellers] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("seller_stores")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .then(({ count, error }) => {
        if (!mounted || error) return;
        setActiveSellers(count ?? 0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const commissionLevels = commissionRules.length;

  return (
  <div className="min-h-screen">
    {/* Nav */}
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <OrusLogo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Plataforma</a>
          <a href="#how" className="hover:text-primary transition-colors">Como funciona</a>
          <Link to="/login-sacoleira" className="hover:text-primary transition-colors">Área da sacoleira</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login-sacoleira"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/login-admin"><Button variant="goldOutline" size="sm">Admin</Button></Link>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial-gold opacity-60" />
      <div className="container relative grid lg:grid-cols-2 gap-12 lg:gap-16 py-16 lg:py-28 items-center">
        <div className="space-y-7 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-gold-soft px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-primary tracking-wider uppercase">SaaS de revenda de joias</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight">
            Sua marca dourada,<br />
            <span className="text-gold italic">multiplicada</span> por quem<br />
            sabe vender.
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Amada Amante conecta seu estoque de atacado a uma rede multinível de sacoleiras com lojas virtuais individuais, comissões por venda e carteira própria.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/admin"><Button variant="gold" size="xl">Entrar como Admin <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/sacoleira"><Button variant="goldOutline" size="xl">Painel da Sacoleira</Button></Link>
          </div>
          <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
            <div>
              <span className="font-display text-2xl text-foreground">
                {activeSellers === null ? "…" : activeSellers}
              </span>
              <br />
              sacoleiras ativas
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <span className="font-display text-2xl text-foreground">{commissionLevels} níveis</span>
              <br />
              de comissão
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <span className="font-display text-2xl text-foreground">Lojas</span>
              <br />
              virtuais individuais
            </div>
          </div>
        </div>
        <div className="relative animate-fade-in">
          <div className="absolute -inset-4 bg-gradient-gold opacity-20 blur-3xl rounded-full" />
          <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-elegant">
            <img src={heroImg} alt="Joias premium Amada Amante" width={1600} height={1024} className="w-full h-auto object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden sm:block glass-panel rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Rede multinível</p>
                <p className="text-sm font-medium">Comissões por venda real</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section id="features" className="container py-20 lg:py-28">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Plataforma</p>
          <h2 className="font-display text-4xl sm:text-5xl font-light">Revenda de joias com marketing multinível.</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f) => (
          <div key={f.title} className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-500 hover:border-primary/40 hover:-translate-y-1">
            <div className="h-11 w-11 rounded-lg bg-gradient-gold-soft border border-primary/20 flex items-center justify-center mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>
    </section>

    {/* How */}
    <section id="how" className="container py-20 border-t border-border/50">
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { n: "01", t: "Cadastre seu estoque", d: "Você adiciona joias no admin com fotos, preço de atacado e estoque." },
          { n: "02", t: "Forme a rede multinível", d: "Aprove sacoleiras, vincule patrocinadoras e acompanhe níveis de indicação." },
          { n: "03", t: "Comissione por venda", d: "Comissões são geradas somente quando pedidos de produto são confirmados." },
        ].map((s) => (
          <div key={s.n} className="relative">
            <span className="font-display text-7xl text-gold opacity-40">{s.n}</span>
            <h3 className="font-display text-2xl mt-2">{s.t}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">{s.d}</p>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="container py-20">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-gold-soft p-10 lg:p-16 text-center">
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-50" />
        <div className="relative">
          <h2 className="font-display text-4xl sm:text-5xl font-light max-w-2xl mx-auto">Pronta para operar sua rede multinível de joias?</h2>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/admin"><Button variant="gold" size="xl">Acessar Admin</Button></Link>
            <Link to="/login-sacoleira"><Button variant="outline" size="xl">Entrar como sacoleira</Button></Link>
          </div>
        </div>
      </div>
    </section>

    <footer className="border-t border-border/50 py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <OrusLogo size="sm" />
        <p>© {new Date().getFullYear()} Amada Amante. Joias em rede.</p>
      </div>
    </footer>
  </div>
  );
};

export default Landing;
