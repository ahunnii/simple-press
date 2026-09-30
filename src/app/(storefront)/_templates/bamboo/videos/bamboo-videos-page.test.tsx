import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BAMBOO_TOP_MARKER } from "../shared/bamboo-emblem-clearance";
import { BambooVideosPage } from "./bamboo-videos-page";

type Props = ComponentProps<typeof BambooVideosPage>;

const business = {
  name: "Test Store",
  siteContent: { customFields: {}, logoUrl: null },
} as unknown as Props["business"];

describe("BambooVideosPage", () => {
  it("renders the Default copy in the marked band and a designed empty state", () => {
    const { container } = render(
      <BambooVideosPage business={business} videos={[] as Props["videos"]} />,
    );
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Videos");
    expect(container.querySelectorAll(`.${BAMBOO_TOP_MARKER}`)).toHaveLength(1);
    expect(container.querySelector("section")).toHaveClass(BAMBOO_TOP_MARKER);
    expect(
      screen.getByRole("heading", { level: 2, name: "No videos yet" }),
    ).toBeInTheDocument();
  });

  it("prefers owner overrides over synced copy", () => {
    render(
      <BambooVideosPage
        business={business}
        videos={
          [
            {
              id: "v1",
              youtubeId: "abc123",
              title: "Synced title",
              titleOverride: "Owner title",
              description: "Synced description",
              descriptionOverride: null,
              thumbnailUrl: null,
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
    expect(screen.getByText("Synced description")).toBeInTheDocument();
  });
});
