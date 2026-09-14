import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LaunchCountdown } from "./launch-countdown";

/**
 * `setup-dom.ts` installs a matchMedia stub that answers `matches: false` to
 * everything, which is the "motion is fine" branch. The reduced-motion test
 * swaps it for one that matches the reduce query, then restores it.
 */
function mockReducedMotion(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

let restoreMatchMedia: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T00:00:00.000Z"));
});

afterEach(() => {
  restoreMatchMedia?.();
  restoreMatchMedia = undefined;
  vi.useRealTimers();
});

describe("LaunchCountdown", () => {
  it("renders '--' placeholders on the server, before any effect can run", () => {
    // `renderToStaticMarkup` never runs effects (there is no DOM, no
    // mount) — this is exactly the SSR pass the component's hydration
    // contract promises to keep byte-identical with React's first client
    // render, which likewise commits before `useEffect` fires.
    const target = new Date("2026-09-15T01:02:03.000Z").toISOString();
    const html = renderToStaticMarkup(<LaunchCountdown targetIso={target} />);
    const scratch = document.createElement("div");
    scratch.innerHTML = html;
    const values = scratch.querySelectorAll("[data-value]");
    expect(values.length).toBe(4);
    for (const el of values) {
      expect(el.textContent).toBe("--");
      expect(el.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("shows real digits once the mount effect has flushed", async () => {
    const target = new Date("2026-09-15T01:02:03.000Z").toISOString();
    render(<LaunchCountdown targetIso={target} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const days = document.querySelector('[data-unit="days"] [data-value]');
    expect(days?.textContent).toBe("01");
    expect(days?.getAttribute("aria-hidden")).toBeNull();
  });

  it("renders the past label once the target has already passed", async () => {
    const target = new Date("2026-09-13T00:00:00.000Z").toISOString();
    render(<LaunchCountdown targetIso={target} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Now open")).toBeInTheDocument();
  });

  it("renders nothing once passed when pastLabel is explicitly null", async () => {
    const target = new Date("2026-09-13T00:00:00.000Z").toISOString();
    const { container } = render(
      <LaunchCountdown targetIso={target} pastLabel={null} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null for an invalid targetIso", async () => {
    const { container } = render(<LaunchCountdown targetIso="not-a-date" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("omits the seconds cell when hideSeconds is set", async () => {
    const target = new Date("2026-09-15T00:00:00.000Z").toISOString();
    render(<LaunchCountdown targetIso={target} hideSeconds />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(document.querySelector('[data-unit="seconds"]')).toBeNull();
  });

  it("omits the seconds cell under reduced motion", async () => {
    restoreMatchMedia = mockReducedMotion(true);
    const target = new Date("2026-09-15T00:00:00.000Z").toISOString();
    render(<LaunchCountdown targetIso={target} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(document.querySelector('[data-unit="seconds"]')).toBeNull();
  });
});
