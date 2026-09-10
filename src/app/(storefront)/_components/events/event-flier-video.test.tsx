import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EventFlierVideo } from "./event-flier-video";

const SRC = "https://storage.artisanalfutures.org/fliers/summer-jam.mp4";
const NAME = "Summer Jam";

/**
 * `setup-dom.ts` installs a matchMedia stub that answers `matches: false` to
 * everything, which is the "motion is fine" branch. Reduced-motion tests swap
 * it for one that matches the reduce query, then restore it in afterEach.
 */
function mockReducedMotion(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

let restoreMatchMedia: (() => void) | undefined;

afterEach(() => {
  restoreMatchMedia?.();
  restoreMatchMedia = undefined;
  vi.restoreAllMocks();
});

function renderVideo(props: Partial<{ name: string }> = {}) {
  const utils = render(<EventFlierVideo src={SRC} {...props} />);
  const video = utils.container.querySelector("video");
  expect(video).not.toBeNull();
  return { ...utils, video: video! };
}

describe("EventFlierVideo", () => {
  it("renders a video element with the given src, muted/looping/inline", () => {
    const { video } = renderVideo();

    expect(video).toHaveAttribute("src", SRC);
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    // No <source type="video/mp4"> child: the type is left to the browser so
    // webm/mov uploads aren't rejected outright.
    expect(video.querySelector("source")).toBeNull();
  });

  it("hides the video from assistive tech (the card's heading names the event)", () => {
    const { video } = renderVideo();

    expect(video).toHaveAttribute("aria-hidden", "true");
  });

  it("autoplays when reduced motion is not requested", () => {
    const { video } = renderVideo();

    expect(video).toHaveAttribute("autoplay");
    expect(
      screen.getByRole("button", { name: "Pause video" }),
    ).toBeInTheDocument();
  });

  it("does not autoplay when prefers-reduced-motion is reduce", () => {
    restoreMatchMedia = mockReducedMotion(true);

    const { video } = renderVideo();

    expect(video).not.toHaveAttribute("autoplay");
    // Starting paused, the control has to offer Play — not Pause.
    expect(
      screen.getByRole("button", { name: "Play video" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pause video" }),
    ).not.toBeInTheDocument();
  });

  it("toggles between pause and play when the control is activated", async () => {
    const user = userEvent.setup();
    const { video } = renderVideo();

    // happy-dom honours .play()/.pause() but never starts playback from the
    // autoplay attribute on its own, so stand in for the browser here —
    // otherwise the element is paused while the control (correctly, for a real
    // browser) offers Pause, and the first click would only resync the two.
    await act(async () => {
      await video.play();
    });

    await user.click(screen.getByRole("button", { name: "Pause video" }));
    expect(video.paused).toBe(true);
    expect(
      screen.getByRole("button", { name: "Play video" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play video" }));
    expect(video.paused).toBe(false);
    expect(
      screen.getByRole("button", { name: "Pause video" }),
    ).toBeInTheDocument();
  });

  it("qualifies the control's accessible name with the event name when given one", () => {
    renderVideo({ name: NAME });

    expect(
      screen.getByRole("button", { name: `Pause video for ${NAME}` }),
    ).toBeInTheDocument();
  });

  it("renders no lightbox trigger — videos play inline, they are not tappable", () => {
    renderVideo({ name: NAME });

    expect(
      screen.queryByRole("button", { name: /view flier/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // The pause/play control is the only button this component ships.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
