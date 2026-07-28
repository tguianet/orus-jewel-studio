import { Suspense, lazy, type ComponentType } from "react";
import type { StoreTemplateHomeProps, StoreTemplateKey } from "./types";
import { normalizeStoreTemplateKey } from "./types";

const EleganceHome = lazy(() => import("./elegance/EleganceHome"));
const BoutiqueHome = lazy(() => import("./boutique/BoutiqueHome"));
const MinimalHome = lazy(() => import("./minimal/MinimalHome"));

const LOADERS: Record<StoreTemplateKey, ComponentType<StoreTemplateHomeProps>> = {
  elegance: EleganceHome,
  boutique: BoutiqueHome,
  minimal: MinimalHome,
};

function TemplateSkeleton() {
  return (
    <div className="animate-pulse space-y-6" data-testid="store-template-skeleton">
      <div className="h-[50vh] min-h-[320px] bg-muted" />
      <div className="container space-y-4 py-8">
        <div className="h-6 w-48 mx-auto rounded bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = StoreTemplateHomeProps & {
  templateKey?: string | null;
};

/**
 * Loja pública: sem @container — breakpoints usam viewport (visual original).
 * Prévia mobile: @container na moldura estreita + previewViewport força layout estreito nos templates.
 */
export function StoreTemplateRenderer({ templateKey, previewMode, ...homeProps }: Props) {
  const key = normalizeStoreTemplateKey(templateKey);
  const Comp = LOADERS[key] || LOADERS.elegance;
  return (
    <div
      className={
        previewMode
          ? "@container w-full min-w-0 overflow-x-hidden"
          : "w-full min-w-0"
      }
      data-store-template={key}
      data-testid={`store-template-${key}`}
      data-preview-mode={previewMode ? "true" : "false"}
    >
      <Suspense fallback={<TemplateSkeleton />}>
        <Comp {...homeProps} previewMode={previewMode} />
      </Suspense>
    </div>
  );
}
