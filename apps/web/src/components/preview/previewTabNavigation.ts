import type { RightPanelSurface } from "~/rightPanelStore";

export function adjacentPreviewSurface(
  surfaces: readonly RightPanelSurface[],
  activeSurfaceId: string,
  direction: "next" | "previous",
): Extract<RightPanelSurface, { kind: "preview" }> | null {
  const previewSurfaces = surfaces.filter(
    (surface): surface is Extract<RightPanelSurface, { kind: "preview" }> =>
      surface.kind === "preview" && surface.resourceId !== null,
  );
  if (previewSurfaces.length < 2) return null;

  const currentIndex = previewSurfaces.findIndex((surface) => surface.id === activeSurfaceId);
  if (currentIndex < 0) return null;

  const offset = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + offset + previewSurfaces.length) % previewSurfaces.length;
  return previewSurfaces[nextIndex] ?? null;
}
