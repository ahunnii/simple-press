import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DreamBalloonStudioProps } from "./dream-balloon-studio";

import { DreamBalloonStudio, withPickParam } from "./dream-balloon-studio";

const STORAGE_KEY = "dream-balloon-palette:form1:balloon-colors";

const props: DreamBalloonStudioProps = {
  fieldId: "balloon-colors",
  max: 2,
  heading: "Build your balloon palette",
  lede: "Tap a balloon to see it up close.",
  ctaLabel: "Use these colors in my quote",
  ctaUrl: "/estimate",
  storageKey: STORAGE_KEY,
  groups: [
    {
      id: "standard",
      label: "Standard",
      description: "Classic glossy colors.",
      finish: "standard",
    },
    {
      id: "pearl",
      label: "Pearl",
      description: "A soft satin sheen that catches the light.",
      finish: "pearl",
    },
    // A group with no visible tiles gets no tab.
    { id: "crystal", label: "Crystal", description: null, finish: "crystal" },
  ],
  tiles: [
    {
      id: "standard-009-bright-red",
      label: "Bright Red",
      code: "009",
      color: "#af1f24",
      imageUrl: "https://cdn.example.com/red.webp",
      family: "Reds",
      groupId: "standard",
    },
    {
      id: "standard-012-fuchsia",
      label: "Fuchsia",
      code: "012",
      color: "#b32a5f",
      imageUrl: "https://cdn.example.com/fuchsia.webp",
      family: "Pinks",
      groupId: "standard",
    },
    {
      id: "pearl-610-gold",
      label: "Pearl Gold",
      code: "610",
      color: null,
      imageUrl: null,
      family: "Metallics",
      groupId: "pearl",
    },
  ],
};

function tile(name: RegExp | string) {
  return within(
    screen.getByRole("radiogroup", { name: "Balloon colors" }),
  ).getByRole("radio", { name });
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("DreamBalloonStudio", () => {
  it("renders finish tabs (only groups with tiles) with counts", () => {
    render(<DreamBalloonStudio {...props} />);
    const tabs = within(screen.getByRole("tablist", { name: "Balloon finish" }))
      .getAllByRole("tab")
      .map((t) => t.textContent);
    expect(tabs).toEqual([
      "All, 3 colors",
      "Standard, 2 colors",
      "Pearl, 1 color",
    ]);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(
      screen.getByText("Every color I carry, across all two finishes."),
    ).toBeInTheDocument();
  });

  it("switches tabs with the arrow keys (automatic activation)", () => {
    render(<DreamBalloonStudio {...props} />);
    const all = screen.getByRole("tab", { name: /^All/ });
    fireEvent.keyDown(all, { key: "ArrowRight" });
    const standard = screen.getByRole("tab", { name: /^Standard/ });
    expect(standard).toHaveAttribute("aria-selected", "true");
    expect(standard).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      standard.id,
    );
    expect(screen.queryByRole("radio", { name: /Pearl Gold/ })).toBeNull();
    expect(
      screen.getByText("Standard: Classic glossy colors."),
    ).toBeInTheDocument();
  });

  it("filters by family with a radiogroup", () => {
    render(<DreamBalloonStudio {...props} />);
    const families = screen.getByRole("radiogroup", { name: "Color family" });
    fireEvent.click(within(families).getByRole("radio", { name: "Pinks" }));
    expect(
      within(families).getByRole("radio", { name: "Pinks" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(tile(/Fuchsia/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Bright Red/ })).toBeNull();
  });

  it("stages a tile on click and shows its details", () => {
    render(<DreamBalloonStudio {...props} />);
    expect(tile(/Bright Red/)).toHaveAttribute("aria-checked", "true");
    fireEvent.click(tile(/Pearl Gold/));
    expect(tile(/Pearl Gold/)).toHaveAttribute("aria-checked", "true");
    // The staged name is a styled <p>, not a heading (it would pollute the
    // page outline), but it still names the tile group.
    expect(
      screen.queryByRole("heading", { name: "Pearl Gold" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Pearl Gold" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pearl finish")).toBeInTheDocument();
    expect(
      screen.getByText("A soft satin sheen that catches the light."),
    ).toBeInTheDocument();
  });

  it("adds with Enter, announces, caps at max and builds the quote link", async () => {
    render(<DreamBalloonStudio {...props} />);
    const cta = () => screen.getAllByRole("link", { name: /quote/i })[0]!;
    expect(cta()).toHaveAttribute("href", "/estimate");

    fireEvent.keyDown(tile(/Bright Red/), { key: "Enter" });
    expect(
      await screen.findByText("Bright Red added — 1 of 2"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Bright Red" }),
    ).toBeInTheDocument();

    fireEvent.click(tile(/Fuchsia/));
    fireEvent.click(screen.getByRole("button", { name: /Add to palette/ }));
    expect(
      await screen.findByText("Fuchsia added — 2 of 2"),
    ).toBeInTheDocument();

    expect(cta()).toHaveAttribute(
      "href",
      `/estimate?pick=${encodeURIComponent(
        "balloon-colors:standard-009-bright-red,standard-012-fuchsia",
      )}`,
    );

    // Full: a third color can't be added.
    fireEvent.click(tile(/Pearl Gold/));
    expect(
      screen.getByRole("button", { name: /Add to palette/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Your palette has 2 colors. Remove one to make room for Pearl Gold.",
      ),
    ).toBeInTheDocument();
    fireEvent.keyDown(tile(/Pearl Gold/), { key: "Enter" });
    expect(
      await screen.findByText(
        "Your palette is full. Remove a color to add Pearl Gold.",
      ),
    ).toBeInTheDocument();

    // Picked tiles are numbered and described.
    expect(tile(/Fuchsia/)).toHaveTextContent("2");
    expect(tile(/Fuchsia/)).toHaveAccessibleName(/in your palette/);
  });

  it("removes a chip and keeps focus in the list", async () => {
    render(<DreamBalloonStudio {...props} />);
    fireEvent.keyDown(tile(/Bright Red/), { key: "Enter" });
    fireEvent.keyDown(tile(/Fuchsia/), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Remove Bright Red" }));
    expect(
      screen.getByRole("button", { name: "Remove Fuchsia" }),
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Remove Fuchsia" }));
    expect(screen.getByRole("heading", { name: "Your palette" })).toHaveFocus();
    expect(
      await screen.findByText("Fuchsia removed — 0 of 2"),
    ).toBeInTheDocument();
  });

  it("draws the garland with a title naming the colors", () => {
    render(<DreamBalloonStudio {...props} />);
    expect(
      screen.getByRole("img", { name: /Empty balloon garland/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(tile(/Bright Red/), { key: "Enter" });
    fireEvent.keyDown(tile(/Pearl Gold/), { key: "Enter" });
    expect(
      screen.getByRole("img", {
        name: "Balloon garland sketch in Bright Red and Pearl Gold",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shuffle/ })).toBeEnabled();
  });

  it("restores the palette from sessionStorage after mount, dropping unknown ids", async () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        "pearl-610-gold",
        "gone-id",
        "standard-012-fuchsia",
        "standard-009-bright-red",
      ]),
    );
    await act(async () => {
      render(<DreamBalloonStudio {...props} />);
    });
    expect(
      screen.getByRole("button", { name: "Remove Pearl Gold" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Fuchsia" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Bright Red" }),
    ).toBeNull();
  });

  it("survives broken sessionStorage", async () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{not json");
    await act(async () => {
      render(<DreamBalloonStudio {...props} />);
    });
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it("moves through the grid with the arrow keys, staging as it goes", () => {
    render(<DreamBalloonStudio {...props} />);
    const red = tile(/Bright Red/);
    expect(red).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(red, { key: "ArrowRight" });
    expect(tile(/Fuchsia/)).toHaveFocus();
    expect(tile(/Fuchsia/)).toHaveAttribute("aria-checked", "true");
    expect(tile(/Fuchsia/)).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(tile(/Fuchsia/), { key: "End" });
    expect(tile(/Pearl Gold/)).toHaveFocus();
  });
});

describe("withPickParam", () => {
  it("appends to a bare path, an existing query, and keeps a hash", () => {
    expect(withPickParam("/estimate", "f:a,b")).toBe(
      "/estimate?pick=f%3Aa%2Cb",
    );
    expect(withPickParam("/estimate?x=1", "f:a")).toBe(
      "/estimate?x=1&pick=f%3Aa",
    );
    expect(withPickParam("/estimate#form", "f:a")).toBe(
      "/estimate?pick=f%3Aa#form",
    );
  });
});
