import { act } from "react";
import { beforeEach, expect, it, vi } from "vite-plus/test";

vi.mock("lucide-react", () => ({
  ArrowLeft: () => null,
  ArrowRight: () => null,
  Camera: () => null,
  ExternalLink: () => null,
  MousePointerClick: () => null,
  PictureInPicture2: () => null,
  RotateCw: () => null,
}));

vi.mock("~/components/ui/button", () => ({
  Button: (props: import("react").ComponentProps<"button">) => <button {...props} />,
}));

vi.mock("~/components/ui/input-group", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    InputGroup: (props: import("react").ComponentProps<"div">) => <div {...props} />,
    InputGroupAddon: (props: import("react").ComponentProps<"div">) => <div {...props} />,
    InputGroupInput: React.forwardRef<HTMLInputElement, import("react").ComponentProps<"input">>(
      (props, ref) => <input {...props} ref={ref} />,
    ),
  };
});

vi.mock("~/components/ui/tooltip", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    Tooltip: ({ children }: { children?: import("react").ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    TooltipTrigger: ({ render }: { render: import("react").ReactNode }) => render,
    TooltipPopup: () => null,
  };
});

import { PreviewChromeRow } from "./PreviewChromeRow";

class TestNode {
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];
  readonly nodeName: string;
  readonly tagName: string;
  readonly namespaceURI = "http://www.w3.org/1999/xhtml";
  readonly style: Record<string, string> = {};
  focusCount = 0;
  selectCount = 0;
  value = "";
  className = "";
  activeElement: TestNode | null = null;

  constructor(
    name: string,
    readonly ownerDocument: TestNode | null = null,
    readonly nodeType = 1,
  ) {
    this.nodeName = name.toUpperCase();
    this.tagName = this.nodeName;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    return this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this) + 1] ?? null;
  }

  set textContent(_value: string) {
    this.childNodes = [];
  }

  appendChild(child: TestNode) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(child: TestNode, before: TestNode | null) {
    child.parentNode = this;
    const index = before ? this.childNodes.indexOf(before) : -1;
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    return child;
  }

  removeChild(child: TestNode) {
    this.childNodes.splice(this.childNodes.indexOf(child), 1);
    child.parentNode = null;
    return child;
  }

  createElement(name: string) {
    return new TestNode(name, this);
  }

  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  removeAttribute() {}
  focus() {
    this.focusCount += 1;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
  select() {
    this.selectCount += 1;
  }
}

function installTestDom() {
  const document = new TestNode("#document", null, 9);
  const window = {
    document,
    HTMLIFrameElement: TestNode,
    addEventListener() {},
    removeEventListener() {},
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("HTMLIFrameElement", window.HTMLIFrameElement);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  return document;
}

function findElement(node: TestNode, tagName: string): TestNode | undefined {
  if (node.tagName === tagName) return node;
  for (const child of node.childNodes) {
    const match = findElement(child, tagName);
    if (match) return match;
  }
  return undefined;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

it("focuses and selects the URL on every focus request, including when already focused", async () => {
  const document = installTestDom();
  const { createRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  const root = createRoot(container as unknown as Element);
  const render = (focusUrlNonce: number) =>
    root.render(
      <PreviewChromeRow
        url="https://example.com/"
        loading={false}
        canGoBack={false}
        canGoForward={false}
        refreshDisabled={false}
        focusUrlNonce={focusUrlNonce}
        onBack={() => {}}
        onForward={() => {}}
        onRefresh={() => {}}
        onSubmit={() => {}}
      />,
    );

  try {
    await act(() => render(1));
    const input = findElement(container, "INPUT");
    expect(input?.focusCount).toBe(1);
    expect(input?.selectCount).toBe(1);

    await act(() => render(2));
    expect(input?.focusCount).toBe(2);
    expect(input?.selectCount).toBe(2);
  } finally {
    await act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
