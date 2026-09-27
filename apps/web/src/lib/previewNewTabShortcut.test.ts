// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  compileResolvedKeybindingsConfig,
  DEFAULT_RESOLVED_KEYBINDINGS,
} from "@t3tools/shared/keybindings";
import { subscribePreviewAction } from "../components/preview/previewActionBus";
import { registerPreviewNewTabShortcut } from "./previewNewTabShortcut";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function setup(context = {}, keybindings = DEFAULT_RESOLVED_KEYBINDINGS) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue("Linux x86_64");
  const actions = vi.fn();
  const consumeInput = vi.fn((event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  const input = document.createElement("textarea");
  document.body.append(input);
  input.focus();
  input.addEventListener("keydown", consumeInput);
  cleanups.push(subscribePreviewAction(actions));
  const unregister = registerPreviewNewTabShortcut(keybindings, () => ({
    isDesktop: true,
    previewFocus: false,
    ...context,
  }));
  cleanups.push(unregister);
  const press = (key: string, repeat = false) => {
    const event = new KeyboardEvent("keydown", {
      key,
      ctrlKey: true,
      repeat,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    return event;
  };
  return { actions, consumeInput, press, unregister };
}

it.each([
  { previewOpen: false },
  { previewOpen: true, editableFocus: true },
  { terminalFocus: true, terminalOpen: true, editableFocus: true },
  { previewFocus: true, previewOpen: true },
])("opens a tab before focused input consumes Ctrl+T: %j", (context) => {
  const { actions, consumeInput, press } = setup(context);
  expect(press("t").defaultPrevented).toBe(true);
  expect(actions).toHaveBeenCalledExactlyOnceWith("new-tab");
  expect(consumeInput).not.toHaveBeenCalled();
  press("t", true);
  expect(actions).toHaveBeenCalledTimes(1);
  expect(consumeInput).not.toHaveBeenCalled();
});

it("honors remapping and releases the capture handler when unregistered", () => {
  const keybindings = compileResolvedKeybindingsConfig([
    { key: "mod+y", command: "preview.newTab", when: "isDesktop" },
  ]);
  const { actions, consumeInput, press, unregister } = setup({}, keybindings);
  press("t");
  expect(actions).not.toHaveBeenCalled();
  expect(consumeInput).toHaveBeenCalledTimes(1);
  press("y");
  expect(actions).toHaveBeenCalledExactlyOnceWith("new-tab");
  expect(consumeInput).toHaveBeenCalledTimes(1);
  unregister();
  press("y");
  expect(actions).toHaveBeenCalledTimes(1);
  expect(consumeInput).toHaveBeenCalledTimes(2);
});

it("leaves Ctrl+T to the browser outside the desktop app", () => {
  const { actions, consumeInput, press } = setup({ isDesktop: false, isWeb: true });
  press("t");
  expect(actions).not.toHaveBeenCalled();
  expect(consumeInput).toHaveBeenCalledTimes(1);
});
