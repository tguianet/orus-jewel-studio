// Converte "#rrggbb" em { h, s, l } (0-360, 0-100, 0-100)
export const hexToHsl = (hex?: string): { h: number; s: number; l: number } | null => {
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
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const hexToHslString = (hex?: string): string | null => {
  const v = hexToHsl(hex);
  return v ? `${v.h} ${v.s}% ${v.l}%` : null;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export const themeCssVars = (primary?: string, secondary?: string): React.CSSProperties => {
  const vars: Record<string, string> = {};
  const p = hexToHsl(primary);
  const s = hexToHsl(secondary);

  if (p) {
    const pStr = `${p.h} ${p.s}% ${p.l}%`;
    vars["--primary"] = pStr;
    vars["--ring"] = pStr;
    vars["--accent"] = pStr;
    // Gradiente gold dinâmico baseado na cor principal
    const lighter = `hsl(${p.h} ${clamp(p.s + 5)}% ${clamp(p.l + 12)}%)`;
    const base = `hsl(${p.h} ${p.s}% ${p.l}%)`;
    const darker = `hsl(${p.h} ${clamp(p.s + 10)}% ${clamp(p.l - 15)}%)`;
    vars["--gradient-gold"] = `linear-gradient(135deg, ${lighter} 0%, ${darker} 50%, ${base} 100%)`;
    vars["--gradient-gold-soft"] = `linear-gradient(135deg, hsl(${p.h} ${p.s}% ${p.l}% / 0.18), hsl(${p.h} ${p.s}% ${clamp(p.l - 10)}% / 0.08))`;
  }
  if (s) {
    vars["--secondary"] = `${s.h} ${s.s}% ${s.l}%`;
    vars["--muted"] = `${s.h} ${s.s}% ${s.l}%`;
  }
  return vars as React.CSSProperties;
};
