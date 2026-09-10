import { act, render, screen, within } from "@testing-library/react";
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

/**
 * happy-dom honours .play()/.pause() but never starts playback from the
 * autoplay attribute on its own, so stand in for the browser here — otherwise
 * the element is paused while the control (correctly, for a real browser)
 * offers Pause, and the first click would only resync the two.
 */
async function startPlaying(video: HTMLVideoElement) {
  await act(async () => {
    await video.play();
  });
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

  it("hides the inline video from assistive tech (the trigger and controls carry the semantics)", () => {
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

    await startPlaying(video);

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

  it("renders a lightbox trigger alongside the controls", () => {
    renderVideo({ name: NAME });

    expect(
      screen.getByRole("button", { name: `View flier for ${NAME}` }),
    ).toBeInTheDocument();
    // Expand trigger + mute + pause, and nothing else, before it opens.
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a dialog with a controllable, unmuted video", async () => {
    const user = userEvent.setup();
    renderVideo({ name: NAME });

    await user.click(
      screen.getByRole("button", { name: `View flier for ${NAME}` }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: `${NAME} — enlarged flier`,
    });
    const dialogVideo = dialog.querySelector("video");
    expect(dialogVideo).not.toBeNull();
    // Native controls are the point of expanding: scrub bar and volume.
    expect(dialogVideo!.controls).toBe(true);
    expect(dialogVideo!.muted).toBe(false);
    expect(
      within(dialog).getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
  });

  it("pauses the inline video while the lightbox is open and resumes on close", async () => {
    const user = userEvent.setup();
    const { video } = renderVideo({ name: NAME });

    await startPlaying(video);

    await user.click(
      screen.getByRole("button", { name: `View flier for ${NAME}` }),
    );
    await screen.findByRole("dialog");
    // Two copies must never play — or sound — at once.
    expect(video.paused).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(video.paused).toBe(false);
  });

  it("leaves the inline video paused on close when the viewer had paused it", async () => {
    const user = userEvent.setup();
    const { video } = renderVideo({ name: NAME });

    await startPlaying(video);

    await user.click(
      screen.getByRole("button", { name: `Pause video for ${NAME}` }),
    );
    expect(video.paused).toBe(true);

    await user.click(
      screen.getByRole("button", { name: `View flier for ${NAME}` }),
    );
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // The viewer's own pause outranks the dialog's bookkeeping.
    expect(video.paused).toBe(true);
    expect(
      screen.getByRole("button", { name: `Play video for ${NAME}` }),
    ).toBeInTheDocument();
  });

  it("clicking the control buttons does not open the dialog", async () => {
    const user = userEvent.setup();
    renderVideo({ name: NAME });

    await user.click(
      screen.getByRole("button", { name: `Pause video for ${NAME}` }),
    );
    await user.click(
      screen.getByRole("button", { name: `Unmute video for ${NAME}` }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts muted and offers an unmute control", () => {
    const { video } = renderVideo({ name: NAME });

    expect(video.muted).toBe(true);
    expect(
      screen.getByRole("button", { name: `Unmute video for ${NAME}` }),
    ).toBeInTheDocument();
  });

  it("toggles the inline video's sound when the mute control is activated", async () => {
    const user = userEvent.setup();
    const { video } = renderVideo({ name: NAME });

    await user.click(
      screen.getByRole("button", { name: `Unmute video for ${NAME}` }),
    );
    expect(video.muted).toBe(false);
    expect(
      screen.getByRole("button", { name: `Mute video for ${NAME}` }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: `Mute video for ${NAME}` }),
    );
    expect(video.muted).toBe(true);
    expect(
      screen.getByRole("button", { name: `Unmute video for ${NAME}` }),
    ).toBeInTheDocument();
  });
});
