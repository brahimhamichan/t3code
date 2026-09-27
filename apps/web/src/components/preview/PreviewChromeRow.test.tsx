// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";
import { TooltipProvider } from "~/components/ui/tooltip";
import { PreviewChromeRow } from "./PreviewChromeRow";

it("selects the whole URL again when focus is requested while editing it", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const url = "https://example.com/dashboard";
  const render = (focusUrlNonce: number) =>
    act(async () => {
      root.render(
        <TooltipProvider>
          <PreviewChromeRow
            url={url}
            loading={false}
            canGoBack={false}
            canGoForward={false}
            refreshDisabled={false}
            focusUrlNonce={focusUrlNonce}
            onBack={() => {}}
            onForward={() => {}}
            onRefresh={() => {}}
            onSubmit={() => {}}
          />
        </TooltipProvider>,
      );
    });
  try {
    await render(1);
    const input = container.querySelector("input")!;
    input.setSelectionRange(4, 4);
    await render(2);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, url.length]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
