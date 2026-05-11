// Converte "#rrggbb" em "H S% L%" (formato esperado pelo Tailwind via hsl(var(--token)))
export const hexToHslString = (hex?: string): string | null => {
  if (!hex) return null;
  const m = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const themeCssVars = (primary?: string, secondary?: string): React.CSSProperties => {
  const vars: Record<string, string> = {};
  const p = hexToHslString(primary);
  const s = hexToHslString(secondary);
  if (p) {
    vars["--primary"] = p;
    vars["--ring"] = p;
    vars["--accent"] = p;
  }
  if (s) {
    vars["--secondary"] = s;
    vars["--muted"] = s;
  }
  return vars as React.CSSProperties;
};
