import type {
  KeybindingCommand,
  KeybindingShortcut,
  KeybindingWhenNode,
  ResolvedKeybindingsConfig,
} from "@t3tools/contracts";

export interface ShortcutEventLike {
  getModifierState?: (key: "AltGraph") => boolean;
  type?: string;
  code?: string;
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface ShortcutModifierStateLike {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface ShortcutMatchContext {
  terminalFocus: boolean;
  terminalOpen: boolean;
  previewFocus: boolean;
  previewOpen: boolean;
  isWeb: boolean;
  isDesktop: boolean;
  editableFocus?: boolean;
  [key: string]: boolean | undefined;
}

export interface ShortcutMatchOptions {
  platform: string;
  context?: Partial<ShortcutMatchContext>;
}

const EVENT_CODE_SHORTCUT_KEYS: Readonly<Record<string, string>> = {
  Backquote: "`",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Equal: "=",
  Minus: "-",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
};

export function normalizeEventKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized === "esc") return "escape";
  return normalized;
}

export function shortcutKeyFromEvent(event: Pick<ShortcutEventLike, "key" | "code">): string {
  const layoutKey = normalizeEventKey(event.key);
  if (/^[a-z]$/.test(layoutKey)) return layoutKey;
  const physicalKey = event.code ? EVENT_CODE_SHORTCUT_KEYS[event.code] : undefined;
  return physicalKey ?? layoutKey;
}

export function resolveEventKeys(event: ShortcutEventLike): Set<string> {
  const layoutKey = normalizeEventKey(event.key);
  const keys = new Set([layoutKey]);
  // The physical-position fallback handles non-Latin letters and symbols
  // without making remapped Latin keys trigger two shortcuts.
  const letterCode = event.code?.match(/^Key([A-Z])$/)?.[1];
  if (letterCode && !/^[a-z]$/.test(layoutKey)) keys.add(letterCode.toLowerCase());
  keys.add(shortcutKeyFromEvent(event));
  return keys;
}

function isMacPlatform(platform: string): boolean {
  return /darwin|mac|iphone|ipad|ipod/i.test(platform);
}

export function matchesShortcutModifiers(
  event: ShortcutModifierStateLike,
  shortcut: KeybindingShortcut,
  platform: string,
): boolean {
  const useMetaForMod = isMacPlatform(platform);
  const expectedMeta = shortcut.metaKey || (shortcut.modKey && useMetaForMod);
  const expectedCtrl = shortcut.ctrlKey || (shortcut.modKey && !useMetaForMod);
  return (
    event.metaKey === expectedMeta &&
    event.ctrlKey === expectedCtrl &&
    event.shiftKey === shortcut.shiftKey &&
    event.altKey === shortcut.altKey
  );
}

function matchesShortcut(
  event: ShortcutEventLike,
  shortcut: KeybindingShortcut,
  platform: string,
): boolean {
  if (
    !isMacPlatform(platform) &&
    event.getModifierState?.("AltGraph") &&
    !/^[a-z0-9]$/i.test(event.key)
  ) {
    return false;
  }
  // A literal plus requires Shift on common layouts; persisted `mod++` rules
  // should match its produced `+` key without a duplicate Shift alias.
  const modifiers =
    shortcut.key === "+" && event.key === "+" && !shortcut.shiftKey
      ? { ...event, shiftKey: false }
      : event;
  if (!matchesShortcutModifiers(modifiers, shortcut, platform)) return false;
  return resolveEventKeys(event).has(shortcut.key);
}

export function resolveContext(
  options: { context?: Partial<ShortcutMatchContext> } | undefined,
): ShortcutMatchContext {
  return {
    terminalFocus: false,
    terminalOpen: false,
    previewFocus: false,
    previewOpen: false,
    isWeb: false,
    isDesktop: false,
    editableFocus: false,
    ...options?.context,
  };
}

function evaluateWhenNode(node: KeybindingWhenNode, context: ShortcutMatchContext): boolean {
  switch (node.type) {
    case "identifier":
      if (node.name === "true") return true;
      if (node.name === "false") return false;
      return Boolean(context[node.name]);
    case "not":
      return !evaluateWhenNode(node.node, context);
    case "and":
      return evaluateWhenNode(node.left, context) && evaluateWhenNode(node.right, context);
    case "or":
      return evaluateWhenNode(node.left, context) || evaluateWhenNode(node.right, context);
  }
}

export function matchesWhenClause(
  whenAst: KeybindingWhenNode | undefined,
  context: ShortcutMatchContext,
): boolean {
  return whenAst === undefined || evaluateWhenNode(whenAst, context);
}

export function resolveShortcutCommand(
  event: ShortcutEventLike,
  keybindings: ResolvedKeybindingsConfig,
  options: ShortcutMatchOptions,
): KeybindingCommand | null {
  const context = resolveContext(options);
  for (let index = keybindings.length - 1; index >= 0; index -= 1) {
    const binding = keybindings[index];
    if (!binding || !matchesWhenClause(binding.whenAst, context)) continue;
    if (matchesShortcut(event, binding.shortcut, options.platform)) return binding.command;
  }
  return null;
}
