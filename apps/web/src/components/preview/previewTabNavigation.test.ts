import { describe, expect, it } from "vite-plus/test";

import type { RightPanelSurface } from "~/rightPanelStore";

import { adjacentPreviewSurface } from "./previewTabNavigation";

const surfaces: readonly RightPanelSurface[] = [
  { id: "browser:one", kind: "preview", resourceId: "one" },
  { id: "diff", kind: "diff" },
  { id: "browser:two", kind: "preview", resourceId: "two" },
  { id: "browser:three", kind: "preview", resourceId: "three" },
];

describe("adjacentPreviewSurface", () => {
  it("wraps through browser surfaces while skipping other panel types", () => {
    expect(adjacentPreviewSurface(surfaces, "browser:three", "next")?.id).toBe("browser:one");
    expect(adjacentPreviewSurface(surfaces, "browser:one", "previous")?.id).toBe("browser:three");
  });

  it("returns null when there is no adjacent browser tab to activate", () => {
    expect(adjacentPreviewSurface(surfaces.slice(0, 2), "browser:one", "next")).toBeNull();
    expect(adjacentPreviewSurface(surfaces, "diff", "next")).toBeNull();
  });
});
