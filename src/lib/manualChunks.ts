/**
 * Agrupa vendors em poucos chunks estáveis (evita fragmentação excessiva).
 * Usado por vite.config.ts e testes.
 */
export function resolveManualChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  if (
    id.includes("react-dom")
    || id.includes("/react/")
    || id.includes("\\react\\")
    || id.includes("scheduler")
  ) {
    return "vendor-react";
  }

  if (id.includes("@supabase") || id.includes("supabase-js")) {
    return "vendor-supabase";
  }

  if (id.includes("@radix-ui") || id.includes("class-variance-authority") || id.includes("clsx") || id.includes("tailwind-merge")) {
    return "vendor-ui";
  }

  if (id.includes("recharts") || id.includes("d3-")) {
    return "vendor-charts";
  }

  if (id.includes("react-router")) {
    return "vendor-router";
  }

  return undefined;
}

export const EXPECTED_VENDOR_CHUNKS = [
  "vendor-react",
  "vendor-supabase",
  "vendor-ui",
  "vendor-router",
] as const;
