import * as LucideIcons from "lucide-react";
import { Square, type LucideIcon } from "lucide-react";

const icons = LucideIcons as unknown as Record<string, LucideIcon>;

export function resolveIcon(name: string): LucideIcon {
  return icons[name] || Square;
}
