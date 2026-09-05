import type { Breakpoint, StudioStyle, StudioStyles } from "../types/document";
import { BREAKPOINTS } from "../types/document";

/** Cascata desktop-first: desktop é a base, tablet/mobile só sobrescrevem o que definirem. */
export function resolveEffectiveStyle(styles: StudioStyles | undefined, breakpoint: Breakpoint): StudioStyle {
  if (!styles) return {};
  const desktop = styles.desktop || {};
  if (breakpoint === "desktop") return { ...desktop };
  if (breakpoint === "tablet") return { ...desktop, ...(styles.tablet || {}) };
  return { ...desktop, ...(styles.tablet || {}), ...(styles.mobile || {}) };
}

export function styleToCss(style: StudioStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (style.fontFamily) css.fontFamily = style.fontFamily;
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.color) css.color = style.color;
  if (style.textAlign) css.textAlign = style.textAlign;
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  if (style.textTransform) css.textTransform = style.textTransform;
  if (style.background) css.background = style.background;
  if (style.backgroundImage) css.backgroundImage = `url(${style.backgroundImage})`;
  if (style.backgroundSize) css.backgroundSize = style.backgroundSize;
  if (style.backgroundPosition) css.backgroundPosition = style.backgroundPosition;
  if (style.borderWidth) css.borderWidth = style.borderWidth;
  if (style.borderColor) css.borderColor = style.borderColor;
  if (style.borderStyle) css.borderStyle = style.borderStyle;
  if (style.borderRadius) css.borderRadius = style.borderRadius;
  if (style.boxShadow) css.boxShadow = style.boxShadow;
  if (style.opacity !== undefined) css.opacity = style.opacity;
  if (style.display) css.display = style.display;
  if (style.flexDirection) css.flexDirection = style.flexDirection;
  if (style.flexWrap) css.flexWrap = style.flexWrap;
  if (style.justifyContent) css.justifyContent = style.justifyContent;
  if (style.alignItems) css.alignItems = style.alignItems;
  if (style.gap) css.gap = style.gap;
  if (style.columns) {
    css.gridTemplateColumns = `repeat(${style.columns}, minmax(0, 1fr))`;
  }
  if (style.width) css.width = style.width;
  if (style.height) css.height = style.height;
  if (style.maxWidth) css.maxWidth = style.maxWidth;
  if (style.minHeight) css.minHeight = style.minHeight;
  if (style.padding) css.padding = style.padding;
  if (style.margin) css.margin = style.margin;
  return css;
}

export function emptyStyles(): StudioStyles {
  return {};
}

export function mergeStyleAtBreakpoint(
  styles: StudioStyles,
  breakpoint: Breakpoint,
  patch: StudioStyle,
): StudioStyles {
  return {
    ...styles,
    [breakpoint]: { ...(styles[breakpoint] || {}), ...patch },
  };
}

export function allBreakpoints(): Breakpoint[] {
  return BREAKPOINTS;
}
