import type { ReactNode } from "react";
import type { Breakpoint } from "../types/document";
import { BREAKPOINT_FRAME_WIDTH } from "../types/document";

export function DeviceFrame({ breakpoint, zoom = 1, children }: { breakpoint: Breakpoint; zoom?: number; children: ReactNode }) {
  const width = BREAKPOINT_FRAME_WIDTH[breakpoint];
  return (
    <div className="min-h-full w-full flex justify-center py-10 px-6">
      <div
        className="bg-background shadow-[0_0_0_1px_hsl(var(--border)),0_30px_80px_-30px_rgba(0,0,0,0.35)] transition-[width] duration-200 ease-out"
        style={{ width: breakpoint === "desktop" ? "100%" : width, maxWidth: "100%", transform: `scale(${zoom})`, transformOrigin: "top center" }}
      >
        {children}
      </div>
    </div>
  );
}
