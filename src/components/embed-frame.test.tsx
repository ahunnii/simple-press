import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EmbedFrame } from "./embed-frame";

vi.mock("~/lib/umami/track", () => ({
  ANALYTICS_EVENTS: { EMBED_ENGAGED: "e", EMBED_ENGAGED_TIME: "t" },
  track: vi.fn(),
}));

// The iframe is withheld until a client-side effect runs, so render into a
// real (happy-dom) container inside act() and read the DOM afterwards.
// Keep happy-dom from actually fetching the iframe src (real network I/O).
beforeAll(() => {
  const hd = (
    window as unknown as {
      happyDOM?: { settings?: { disableIframePageLoading?: boolean } };
    }
  ).happyDOM;
  if (hd?.settings) hd.settings.disableIframePageLoading = true;
});

async function renderPolicy(src: string): Promise<string | null | undefined> {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(EmbedFrame, { src, title: "Test embed" }));
  });
  const iframe = container.querySelector("iframe");
  const policy = iframe ? iframe.getAttribute("referrerpolicy") : undefined;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return policy;
}

describe("EmbedFrame referrer policy", () => {
  it("sends the origin for YouTube (avoids Error 153)", async () => {
    expect(
      await renderPolicy("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("strict-origin-when-cross-origin");
  });

  it("sends the origin for Vimeo", async () => {
    expect(await renderPolicy("https://player.vimeo.com/video/76979871")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("keeps no-referrer for other embed hosts", async () => {
    expect(await renderPolicy("https://example.com/widget")).toBe(
      "no-referrer",
    );
  });
});
