import type { StudioNodeDefinition, StudioRegistry, StudioNodeCategory } from "./types";
import { sectionDef, containerDef, flexDef, gridDef, cardDef, spacerDef, dividerDef } from "./nodes/layout";
import { headingDef, textDef, buttonDef } from "./nodes/text";
import { imageDef, videoDef, galleryDef, iconDef } from "./nodes/media";
import {
  productGridDef,
  productCarouselDef,
  featuredProductsDef,
  categorySectionDef,
  promotionalCollectionDef,
  productCardDef,
  whatsappDef,
} from "./nodes/products";

export const studioRegistry: StudioRegistry = {
  section: sectionDef,
  container: containerDef,
  flex: flexDef,
  grid: gridDef,
  card: cardDef,
  spacer: spacerDef,
  divider: dividerDef,
  heading: headingDef,
  text: textDef,
  button: buttonDef,
  image: imageDef,
  video: videoDef,
  gallery: galleryDef,
  icon: iconDef,
  productGrid: productGridDef,
  productCarousel: productCarouselDef,
  featuredProducts: featuredProductsDef,
  categorySection: categorySectionDef,
  promotionalCollection: promotionalCollectionDef,
  productCard: productCardDef,
  whatsapp: whatsappDef,
};

export function getNodeDefinition(type: string): StudioNodeDefinition {
  const def = studioRegistry[type];
  if (!def) throw new Error(`Studio: tipo de nó desconhecido "${type}"`);
  return def;
}

export function listNodeDefinitions(category?: StudioNodeCategory): StudioNodeDefinition[] {
  const all = Object.values(studioRegistry);
  return category ? all.filter((d) => d.category === category) : all;
}

export * from "./types";
