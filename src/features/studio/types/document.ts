export type Breakpoint = "desktop" | "tablet" | "mobile";

export const BREAKPOINTS: Breakpoint[] = ["desktop", "tablet", "mobile"];

export const BREAKPOINT_FRAME_WIDTH: Record<Breakpoint, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

export type StudioStyle = {
  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  // Background
  background?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  // Border
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  borderRadius?: string;
  boxShadow?: string;
  opacity?: number;
  // Layout / box model
  display?: "block" | "flex" | "grid" | "none";
  flexDirection?: "row" | "column";
  flexWrap?: "wrap" | "nowrap";
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  columns?: number;
  width?: string;
  height?: string;
  maxWidth?: string;
  minHeight?: string;
  padding?: string;
  margin?: string;
};

export type StudioStyles = Partial<Record<Breakpoint, StudioStyle>>;

export interface StudioNode {
  id: string;
  type: string;
  name?: string;
  props: Record<string, unknown>;
  styles: StudioStyles;
  children?: StudioNode[];
  locked?: boolean;
  hidden?: boolean;
}

export interface StudioPageDocument {
  id: string;
  storeId: string;
  pageType: string;
  version: number;
  nodes: StudioNode[];
  updatedAt?: string;
}

export type SaveStatus = "idle" | "saved" | "saving" | "unsaved" | "error";
