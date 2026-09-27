import type { ResolvedKeybindingsConfig } from "@t3tools/contracts";
import { dispatchPreviewAction } from "../components/preview/previewActionBus";
import { resolveShortcutCommand, type ShortcutMatchContext } from "../keybindings";

export function registerPreviewNewTabShortcut(
  keybindings: ResolvedKeybindingsConfig,
  getContext: (event: KeyboardEvent) => Partial<ShortcutMatchContext>,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const command = resolveShortcutCommand(event, keybindings, { context: getContext(event) });
    if (command !== "preview.newTab") return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) dispatchPreviewAction("new-tab");
  };
  // Reserve the configured shortcut before terminals or editors consume it.
  window.addEventListener("keydown", onKeyDown, { capture: true });
  return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
}
