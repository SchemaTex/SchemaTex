import { describe, expect, it } from "vitest";
import { pointInSvg } from "../../src/core/screen-point";
import {
  attachViewport,
  type ViewportController,
  type ViewportState,
} from "../../src/viewport";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

class FakeElement extends EventTarget {
  style = {
    position: "",
    overflow: "",
    touchAction: "",
    transform: "",
    transformOrigin: "",
  };
  clientWidth = 0;
  clientHeight = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  ownerDocument: {
    defaultView: { ResizeObserver?: typeof ResizeObserver } | undefined;
  } = { defaultView: undefined };
  svg: FakeElement | null = null;
  capturedPointers: number[] = [];

  constructor(private rect: Rect) {
    super();
  }

  getBoundingClientRect(): Rect {
    return { ...this.rect };
  }

  setBoundingClientRect(rect: Rect): void {
    this.rect = rect;
  }

  querySelector<T>(): T | null {
    return this.svg as T | null;
  }

  getAttribute(): string | null {
    return null;
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointers.push(pointerId);
  }
  releasePointerCapture(): void {}
}

class FakeResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(): void {}
  disconnect(): void {}

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function fixture(
  options: Parameters<typeof attachViewport>[2] = {},
  {
    initiallyHidden = false,
    observeResize = false,
  }: {
    initiallyHidden?: boolean;
    observeResize?: boolean;
  } = {},
): {
  controller: ViewportController;
  frame: FakeElement;
  host: FakeElement;
  svg: FakeElement;
  changes: ViewportState[];
  resizeObserver: FakeResizeObserver | null;
} {
  const frame = new FakeElement({
    left: 0,
    top: 0,
    width: initiallyHidden ? 0 : 200,
    height: initiallyHidden ? 0 : 200,
  });
  frame.clientWidth = initiallyHidden ? 0 : 200;
  frame.clientHeight = initiallyHidden ? 0 : 200;
  const host = new FakeElement({
    left: 0,
    top: 0,
    width: initiallyHidden ? 0 : 400,
    height: initiallyHidden ? 0 : 200,
  });
  const svg = new FakeElement({
    left: 0,
    top: 0,
    width: initiallyHidden ? 0 : 400,
    height: initiallyHidden ? 0 : 200,
  });
  host.svg = svg;
  let resizeObserver: FakeResizeObserver | null = null;
  if (observeResize) {
    class FixtureResizeObserver extends FakeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        resizeObserver = this;
      }
    }
    frame.ownerDocument.defaultView = {
      ResizeObserver: FixtureResizeObserver as unknown as typeof ResizeObserver,
    };
  }
  const changes: ViewportState[] = [];
  const controller = attachViewport(
    frame as unknown as HTMLElement,
    host as unknown as HTMLElement,
    options,
    (state) => changes.push(state),
  );
  return { controller, frame, host, svg, changes, resizeObserver };
}

function pointerEvent(
  type: string,
  {
    pointerId,
    clientX,
    clientY,
    pointerType = "touch",
    claimed = false,
  }: {
    pointerId: number;
    clientX: number;
    clientY: number;
    pointerType?: string;
    claimed?: boolean;
  },
): Event {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    button: 0,
    pointerId,
    pointerType,
    clientX,
    clientY,
  });
  if (claimed) event.preventDefault();
  return event;
}

function transformedSvg(scale: number, x: number, y: number) {
  const inverse = {
    a: 1 / scale,
    b: 0,
    c: 0,
    d: 1 / scale,
    e: -x / scale,
    f: -y / scale,
  };
  return {
    getScreenCTM: () => ({ inverse: () => inverse }),
    createSVGPoint: () => ({
      x: 0,
      y: 0,
      matrixTransform(matrix: typeof inverse) {
        return {
          x: this.x * matrix.a + this.y * matrix.c + matrix.e,
          y: this.x * matrix.b + this.y * matrix.d + matrix.f,
        };
      },
    }),
  } as unknown as Pick<SVGSVGElement, "createSVGPoint" | "getScreenCTM">;
}

describe("viewport coordinate contract", () => {
  it("inverts an ancestor translate and scale back to SVG coordinates", () => {
    const svg = transformedSvg(2, 40, 20);
    expect(pointInSvg(svg, 260, 140)).toEqual({ x: 110, y: 60 });
  });

  it("converts a CSS-pixel drag through the ancestor scale", () => {
    const svg = transformedSvg(2, 40, 20);
    const start = pointInSvg(svg, 260, 140);
    const end = pointInSvg(svg, 340, 140);
    if (!start || !end) throw new Error("expected an invertible screen matrix");
    expect(end.x - start.x).toBe(40);
    expect(end.y - start.y).toBe(0);
  });
});

describe("attachViewport", () => {
  it("fits, zooms around an anchor, pans, and clamps scale", () => {
    const { controller, host } = fixture({ minScale: 0.5, maxScale: 2 });

    expect(controller.getState()).toEqual({ scale: 0.5, x: 0, y: 50 });
    expect(host.style.transform).toBe("translate(0px, 50px) scale(0.5)");

    controller.zoomTo(1, { x: 50, y: 100 });
    expect(controller.getState()).toEqual({ scale: 1, x: -50, y: 0 });

    controller.panBy(25, 0);
    expect(controller.getState()).toEqual({ scale: 1, x: -25, y: 0 });

    controller.zoomTo(99);
    expect(controller.getState().scale).toBe(2);
    controller.zoomTo(0.01);
    expect(controller.getState().scale).toBe(0.5);
  });

  it("defers the initial contain fit until a hidden frame has non-zero size", () => {
    const {
      controller,
      frame,
      host,
      svg,
      resizeObserver,
    } = fixture({}, { initiallyHidden: true, observeResize: true });

    expect(controller.getState()).toEqual({ scale: 1, x: 0, y: 0 });

    frame.setBoundingClientRect({ left: 0, top: 0, width: 200, height: 200 });
    frame.clientWidth = 200;
    frame.clientHeight = 200;
    host.setBoundingClientRect({ left: 0, top: 0, width: 400, height: 200 });
    svg.setBoundingClientRect({ left: 0, top: 0, width: 400, height: 200 });
    resizeObserver?.trigger();

    expect(controller.getState()).toEqual({ scale: 0.5, x: 0, y: 50 });
    expect(host.style.transform).toBe("translate(0px, 50px) scale(0.5)");

    controller.zoomTo(1, { x: 100, y: 100 });
    resizeObserver?.trigger();
    expect(controller.getState().scale).toBe(1);
  });

  it("requires a modifier for wheel zoom by default", () => {
    const { controller, frame } = fixture({ initialFit: "none" });
    const bareWheel = new Event("wheel", { cancelable: true });
    Object.assign(bareWheel, {
      clientX: 100,
      clientY: 100,
      ctrlKey: false,
      metaKey: false,
      deltaMode: 0,
      deltaY: -100,
    });
    frame.dispatchEvent(bareWheel);
    expect(controller.getState().scale).toBe(1);
    expect(bareWheel.defaultPrevented).toBe(false);

    const modifiedWheel = new Event("wheel", { cancelable: true });
    Object.assign(modifiedWheel, {
      clientX: 100,
      clientY: 100,
      ctrlKey: true,
      metaKey: false,
      deltaMode: 0,
      deltaY: -100,
    });
    frame.dispatchEvent(modifiedWheel);
    expect(controller.getState().scale).toBeGreaterThan(1);
    expect(modifiedWheel.defaultPrevented).toBe(true);
  });

  it("captures an unclaimed pointer only after it becomes a pan", () => {
    const { controller, frame } = fixture({ initialFit: "none" });
    frame.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    }));
    expect(frame.capturedPointers).toEqual([]);

    frame.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 98,
      clientY: 100,
    }));
    expect(frame.capturedPointers).toEqual([]);
    expect(controller.getState()).toEqual({ scale: 1, x: 0, y: 0 });

    frame.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 80,
      clientY: 100,
    }));
    expect(frame.capturedPointers).toEqual([9]);
    expect(controller.getState()).toEqual({ scale: 1, x: -20, y: 0 });
  });

  it("does not let a missing post-pan click suppress the next pointer sequence", () => {
    const { frame } = fixture({ initialFit: "none" });
    frame.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    }));
    frame.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 80,
      clientY: 100,
    }));
    frame.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 80,
      clientY: 100,
    }));

    frame.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 10,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    }));
    frame.dispatchEvent(pointerEvent("pointerup", {
      pointerId: 10,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    }));
    const click = new Event("click", { bubbles: true, cancelable: true });
    frame.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
  });

  it("restores every mutated inline style on detach", () => {
    const { controller, frame, host } = fixture();
    controller.detach();

    expect(frame.style.position).toBe("");
    expect(frame.style.overflow).toBe("");
    expect(frame.style.touchAction).toBe("");
    expect(host.style.transform).toBe("");
    expect(host.style.transformOrigin).toBe("");
  });

  it("pans only unclaimed pointers and switches a claimed touch drag into pinch", () => {
    const { controller, frame, host } = fixture({ initialFit: "none" });

    frame.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 7,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
      claimed: true,
    }));
    frame.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 7,
      pointerType: "mouse",
      clientX: 150,
      clientY: 100,
    }));
    expect(controller.getState()).toEqual({ scale: 1, x: 0, y: 0 });

    let cancelledPointerId = 0;
    host.svg?.addEventListener("pointercancel", (event) => {
      cancelledPointerId = (event as unknown as { pointerId: number }).pointerId;
    });
    frame.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 1,
      clientX: 50,
      clientY: 100,
      claimed: true,
    }));
    frame.dispatchEvent(pointerEvent("pointerdown", {
      pointerId: 2,
      clientX: 150,
      clientY: 100,
    }));
    expect(cancelledPointerId).toBe(1);

    frame.dispatchEvent(pointerEvent("pointermove", {
      pointerId: 2,
      clientX: 180,
      clientY: 100,
    }));
    expect(controller.getState().scale).toBeCloseTo(1.3);
  });
});
