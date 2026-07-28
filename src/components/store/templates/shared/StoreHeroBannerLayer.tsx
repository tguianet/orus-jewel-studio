import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  OFFICIAL_CAMPAIGN_BADGE,
  normalizeHeroSlides,
  resolveHeroSlideImageUrl,
  type StoreHeroSlide,
} from "@/lib/storeHeroSlides";

type Props = {
  banners: string[];
  heroSlides?: StoreHeroSlide[];
  storeName: string;
  /** Força layout estreito (prévia mobile) */
  preferMobile?: boolean;
  previewMode?: boolean;
  className?: string;
  imgClassName?: string;
  /** Elegance usa absolute fill; boutique/minimal usam bloco */
  fill?: boolean;
  showControls?: boolean;
  onSlideChange?: (slide: StoreHeroSlide, index: number) => void;
  children?: (ctx: { slide: StoreHeroSlide; index: number }) => ReactNode;
};

/**
 * Camada compartilhada de banners (campanha oficial + próprios).
 * Lazy-load nas imagens não prioritárias; falha de campanha não quebra a loja.
 */
export function StoreHeroBannerLayer({
  banners,
  heroSlides,
  storeName,
  preferMobile = false,
  previewMode = false,
  className = "",
  imgClassName = "absolute inset-0 w-full h-full object-cover",
  fill = true,
  showControls = true,
  onSlideChange,
  children,
}: Props) {
  const slides = useMemo(() => normalizeHeroSlides(heroSlides, banners), [heroSlides, banners]);
  const slidesKey = useMemo(() => slides.map((s) => s.id).join("|"), [slides]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [slidesKey]);

  useEffect(() => {
    if (previewMode || slides.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length, previewMode]);

  useEffect(() => {
    const slide = slides[idx];
    if (slide) onSlideChange?.(slide, idx);
  }, [idx, slides, onSlideChange]);

  const current = slides[idx] || null;
  const [isNarrowViewport, setIsNarrowViewport] = useState(preferMobile);

  useEffect(() => {
    if (preferMobile) {
      setIsNarrowViewport(true);
      return;
    }
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrowViewport(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [preferMobile]);

  if (!slides.length) return null;

  return (
    <div className={`relative overflow-hidden ${className}`} data-testid="store-hero-banner-layer">
      {slides.map((slide, i) => {
        const src = resolveHeroSlideImageUrl(slide, isNarrowViewport);
        return (
          <img
            key={slide.id}
            src={src}
            alt={
              slide.kind === "campaign"
                ? slide.title || OFFICIAL_CAMPAIGN_BADGE
                : `Banner ${i + 1} ${storeName}`
            }
            width={1600}
            height={900}
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            className={`${imgClassName} transition-opacity duration-[1200ms] ${
              fill ? "absolute inset-0" : ""
            } ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            data-slide-kind={slide.kind}
            data-campaign={slide.kind === "campaign" ? "true" : "false"}
          />
        );
      })}

      {current?.kind === "campaign" && (
        <span
          className="absolute top-3 left-3 z-20 rounded-md bg-black/45 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/95 border border-white/20"
          data-testid="official-campaign-badge"
        >
          {OFFICIAL_CAMPAIGN_BADGE}
        </span>
      )}

      {children && current ? children({ slide: current, index: idx }) : null}

      {showControls && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Banner anterior"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-foreground transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            aria-label="Próximo banner"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-foreground transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-[2px] rounded-full transition-all ${
                  i === idx ? "w-10 bg-white" : "w-5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
