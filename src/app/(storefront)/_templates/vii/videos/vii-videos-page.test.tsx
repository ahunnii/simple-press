import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViiVideosPage } from "./vii-videos-page";

type Props = ComponentProps<typeof ViiVideosPage>;

function makeBusiness(customFields: Record<string, unknown> = {}) {
  return {
    name: "Test Store",
    siteContent: { customFields, logoUrl: null },
  } as unknown as Props["business"];
}

describe("ViiVideosPage", () => {
  it("renders Default's copy in the generic band with the overline", () => {
    const { container } = render(
      <ViiVideosPage
        business={makeBusiness()}
        videos={[] as unknown as Props["videos"]}
      />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Videos");
    const band = container.querySelector('[data-sp-group="videos.hero"]');
    expect(band).toContainElement(screen.getByText("Watch"));
    expect((band as HTMLElement).style.paddingLeft).toBe(
      "var(--vii-section-pad-x)",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No videos yet" }),
    ).toBeInTheDocument();
  });

  it("uses the owner override over the synced title", () => {
    render(
      <ViiVideosPage
        business={makeBusiness()}
        videos={
          [
            {
              id: "v1",
              youtubeId: "abc123",
              title: "Synced title",
              titleOverride: "Owner title",
              description: null,
              descriptionOverride: null,
              thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
              thumbnailOverride: null,
            },
          ] as unknown as Props["videos"]
        }
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Owner title" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Synced title")).toBeNull();
  });
});
