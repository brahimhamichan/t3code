import type { DesktopPreviewShortcut } from "@t3tools/contracts";

let dispatchingPreviewShortcut = false;

/** Focus belongs to the preview page, browser chrome, or active preview tab strip. */
export function isPreviewFocused(): boolean {
  if (dispatchingPreviewShortcut) return true;
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return false;
  if (!activeElement.isConnected) return false;
  if (activeElement.tagName.toLowerCase() === "webview") return true;
  return activeElement.closest('[data-preview-active="true"], [data-preview-viewport]') !== null;
}

/** Delivers guest shortcuts through the same handlers as app chrome shortcuts. */
export function dispatchPreviewShortcut(input: DesktopPreviewShortcut): void {
  if (input.type === "keyup") {
    window.dispatchEvent(new KeyboardEvent("keyup", input));
    return;
  }
  const webview = Array.from(
    document.querySelectorAll<HTMLElement>("webview[data-preview-tab]"),
  ).find((node) => node.dataset.previewTab === input.tabId);
  // A delayed IPC message must not operate on a different thread or hidden tab.
  if (!webview || webview.getAttribute("aria-hidden") === "true") return;
  const event = new KeyboardEvent(input.type, { ...input, bubbles: true, cancelable: true });
  const previous = dispatchingPreviewShortcut;
  dispatchingPreviewShortcut = true;
  try {
    webview.dispatchEvent(event);
  } finally {
    dispatchingPreviewShortcut = previous;
  }
}
