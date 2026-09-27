import type { DesktopPreviewShortcut } from "@t3tools/contracts";
import { DEFAULT_RESOLVED_KEYBINDINGS } from "@t3tools/shared/keybindings";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { resolveShortcutCommand } from "../keybindings";
import { dispatchPreviewShortcut, isPreviewFocused } from "./previewFocus";

class TestKeyboardEvent extends Event {
  constructor(type: string, input: KeyboardEventInit) {
    super(type, input);
    Object.assign(
      this,
      Object.fromEntries(
        Object.entries(input).filter(
          ([key]) => !["type", "bubbles", "cancelable", "composed"].includes(key),
        ),
      ),
    );
  }
}

function setup() {
  const guest = Object.assign(new EventTarget(), {
    dataset: { previewTab: "current-tab" },
    getAttribute: vi.fn(() => null as string | null),
  });
  const app = new EventTarget();
  vi.stubGlobal("KeyboardEvent", TestKeyboardEvent);
  vi.stubGlobal("HTMLElement", EventTarget);
  vi.stubGlobal("window", app);
  vi.stubGlobal("document", {
    activeElement: null,
    querySelectorAll: () => [guest],
  });
  return { guest, app };
}

const shortcut: DesktopPreviewShortcut = {
  tabId: "current-tab",
  type: "keydown",
  key: "l",
  code: "KeyL",
  metaKey: true,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
};

afterEach(() => vi.unstubAllGlobals());

describe("preview shortcut delivery", () => {
  it("resolves a guest shortcut with preview focus and restores app focus context afterwards", () => {
    const { guest } = setup();
    const commands: unknown[] = [];
    guest.addEventListener("keydown", (event) => {
      commands.push(
        resolveShortcutCommand(event as KeyboardEvent, DEFAULT_RESOLVED_KEYBINDINGS, {
          platform: "MacIntel",
          context: { previewFocus: isPreviewFocused() },
        }),
      );
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
      expect((event as KeyboardEvent).repeat).toBe(true);
      expect((event as KeyboardEvent).code).toBe("KeyL");
    });
    dispatchPreviewShortcut({ ...shortcut, repeat: true });
    expect(commands).toEqual(["preview.focusUrl"]);
    expect(isPreviewFocused()).toBe(false);
  });

  it("ignores delayed keydowns from hidden or unmounted tabs", () => {
    const { guest } = setup();
    const handler = vi.fn();
    guest.addEventListener("keydown", handler);
    dispatchPreviewShortcut({ ...shortcut, tabId: "closed-tab" });
    guest.getAttribute.mockReturnValue("true");
    dispatchPreviewShortcut(shortcut);
    expect(handler).not.toHaveBeenCalled();
  });

  it("releases modifiers even when the shortcut has already closed its tab", () => {
    const { app, guest } = setup();
    guest.getAttribute.mockReturnValue("true");
    const releases: boolean[] = [];
    app.addEventListener("keyup", (event) => {
      releases.push((event as KeyboardEvent).metaKey);
      expect(isPreviewFocused()).toBe(false);
    });
    dispatchPreviewShortcut({ ...shortcut, type: "keyup", key: "Meta", metaKey: false });
    expect(releases).toEqual([false]);
  });
});
