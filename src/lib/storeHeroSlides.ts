import type { GlobalStoreBanner } from "@/lib/globalStoreBanners";
import { isSafeBannerButtonUrl } from "@/lib/globalStoreBanners";

export type StoreHeroSlideKind = "campaign" | "seller" | "fallback";

/** Contrato comum de banner para Elegance, Boutique e Minimal. */
export type StoreHeroSlide = {
  id: string;
  kind: StoreHeroSlideKind;
  imageUrl: string;
  mobileImageUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
};

export const OFFICIAL_CAMPAIGN_BADGE = "Campanha oficial Amada Amante";

export function urlsToHeroSlides(urls: string[], kind: StoreHeroSlideKind = "seller"): StoreHeroSlide[] {
  const seen = new Set<string>();
  const slides: StoreHeroSlide[] = [];
  urls.forEach((url, i) => {
    const imageUrl = String(url || "").trim();
    if (!imageUrl || seen.has(imageUrl)) return;
    seen.add(imageUrl);
    slides.push({
      id: `${kind}-${i}-${imageUrl.slice(-24)}`,
      kind,
      imageUrl,
    });
  });
  return slides;
}

export function campaignToHeroSlide(c: GlobalStoreBanner): StoreHeroSlide {
  const buttonUrl = c.buttonUrl && isSafeBannerButtonUrl(c.buttonUrl) ? c.buttonUrl : null;
  return {
    id: `campaign-${c.id}`,
    kind: "campaign",
    imageUrl: c.imageUrl,
    mobileImageUrl: c.mobileImageUrl,
    title: c.title,
    subtitle: c.subtitle,
    buttonText: c.buttonText,
    buttonUrl,
  };
}

/**
 * Ordem pública: campanhas oficiais → banners da sacoleira → fallback.
 * Não muta theme JSONB nem remove banners próprios.
 */
export function mergeStoreHeroSlides(opts: {
  campaigns: GlobalStoreBanner[];
  sellerBannerUrls: string[];
  fallbackUrl?: string | null;
}): StoreHeroSlide[] {
  const campaignSlides = opts.campaigns.map(campaignToHeroSlide);
  const sellerSlides = urlsToHeroSlides(opts.sellerBannerUrls, "seller");
  const seen = new Set(campaignSlides.map((s) => s.imageUrl));
  const uniqueSeller = sellerSlides.filter((s) => {
    if (seen.has(s.imageUrl)) return false;
    seen.add(s.imageUrl);
    return true;
  });
  const merged = [...campaignSlides, ...uniqueSeller];
  if (merged.length === 0 && opts.fallbackUrl) {
    return urlsToHeroSlides([opts.fallbackUrl], "fallback");
  }
  return merged;
}

/** Resolve imagem desktop/mobile sem overflow; mobile opcional com fallback desktop. */
export function resolveHeroSlideImageUrl(
  slide: StoreHeroSlide,
  preferMobile: boolean,
): string {
  if (preferMobile && slide.mobileImageUrl?.trim()) {
    return slide.mobileImageUrl.trim();
  }
  return slide.imageUrl;
}

export function normalizeHeroSlides(
  heroSlides: StoreHeroSlide[] | undefined,
  banners: string[],
): StoreHeroSlide[] {
  if (heroSlides && heroSlides.length > 0) return heroSlides;
  return urlsToHeroSlides(banners, "seller");
}

export function heroSlidesToBannerUrls(slides: StoreHeroSlide[]): string[] {
  return slides.map((s) => s.imageUrl);
}
