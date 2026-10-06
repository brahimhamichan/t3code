// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { BrowserDocumentFrame } from "./BrowserDocumentFrame";

vi.mock("~/hooks/useHtmlRenderTheme", () => ({
  useHtmlRenderTheme: () => ({ appearance: "light", variables: {} }),
}));

describe("HTML document fullscreen permissions", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    const mountedRoot = root;
    root = undefined;
    if (mountedRoot) await act(() => mountedRoot.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderFrame(element: ReactNode) {
    const mountedRoot = root;
    if (!mountedRoot) throw new Error("Test root is not mounted");
    await act(() => mountedRoot.render(element));
    const frame = container.querySelector("iframe");
    if (!frame) throw new Error("Expected an HTML iframe");
    return frame;
  }

  function expectFullscreenOnly(frame: HTMLIFrameElement, sandbox: string) {
    expect(frame.getAttribute("allow")).toBe("fullscreen");
    expect(frame.hasAttribute("allowfullscreen")).toBe(true);
    expect(frame.getAttribute("sandbox")).toBe(sandbox);
  }

  it("delegates fullscreen to regular HTML previews while preserving their sandbox", async () => {
    const frame = await renderFrame(
      <BrowserDocumentFrame
        src="https://environment.test/page.html"
        title="page.html"
        pdf={false}
      />,
    );

    expectFullscreenOnly(frame, "allow-scripts allow-forms allow-popups");
  });

  it("delegates fullscreen to agent HTML renders without relaxing their opaque origin", async () => {
    const frame = await renderFrame(
      <BrowserDocumentFrame
        src="https://environment.test/render.html"
        title="Rendered page"
        pdf={false}
        htmlRender
      />,
    );

    expectFullscreenOnly(frame, "allow-scripts allow-forms");
  });
});
