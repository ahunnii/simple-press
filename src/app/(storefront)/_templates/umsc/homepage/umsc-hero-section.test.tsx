import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UmscHeroSection } from "./umsc-hero-section";

/**
 * Hero background video controls (WCAG 2.2.2): pause/play button, no
 * autoplay for reduced-motion visitors, a per-session saved choice, and
 * pausing while the hero is off screen.
 */

const baseProps = {
  headline: "Handmade essentials",
  lede: "",
  primaryLabel: "",
  primaryUrl: "",
  secondaryLabel: "",
  secondaryUrl: "",
};

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

let intersect: ((isIntersecting: boolean) => void) | undefined;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersect = (isIntersecting) =>
      callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords() {
    return [];
  }
}

let play: ReturnType<typeof vi.fn<() => Promise<void>>>;
let pause: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  window.sessionStorage.clear();
  mockReducedMotion(false);
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  pause = vi.fn<() => void>();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  intersect = undefined;
});

describe("UmscHeroSection background video", () => {
  it("renders no pause button without a video", () => {
    render(<UmscHeroSection {...baseProps} />);
    expect(screen.queryByRole("button", { name: /background video/i })).toBe(
      null,
    );
  });

  it("plays for a motion-OK visitor and pauses on click, saving the choice", () => {
    render(<UmscHeroSection {...baseProps} video="/hero.mp4" />);
    expect(play).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Pause background video" }),
    );
    expect(pause).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Play background video" }),
    ).toBeTruthy();
    expect(window.sessionStorage.getItem("umsc-hero-video")).toBe("pause");
  });

  it("never starts the video for a reduced-motion visitor until they press play", () => {
    mockReducedMotion(true);
    render(<UmscHeroSection {...baseProps} video="/hero.mp4" />);
    expect(play).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Play background video" }),
    );
    expect(play).toHaveBeenCalled();
    expect(window.sessionStorage.getItem("umsc-hero-video")).toBe("play");
  });

  it("respects a pause choice saved earlier in the session", () => {
    window.sessionStorage.setItem("umsc-hero-video", "pause");
    render(<UmscHeroSection {...baseProps} video="/hero.mp4" />);
    expect(play).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Play background video" }),
    ).toBeTruthy();
  });

  it("pauses while scrolled off screen and resumes when back", () => {
    render(<UmscHeroSection {...baseProps} video="/hero.mp4" />);
    play.mockClear();

    act(() => intersect?.(false));
    expect(pause).toHaveBeenCalled();

    act(() => intersect?.(true));
    expect(play).toHaveBeenCalled();
    // Off-screen pausing is automatic, not the visitor's choice.
    expect(
      screen.getByRole("button", { name: "Pause background video" }),
    ).toBeTruthy();
  });
});
