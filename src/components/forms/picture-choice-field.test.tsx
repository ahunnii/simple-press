import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  FormPictureChoiceField,
  FormPictureOption,
} from "~/lib/validators/form";

import { PictureChoiceField } from "./picture-choice-field";

function makeField(
  overrides: Partial<FormPictureChoiceField> = {},
): FormPictureChoiceField {
  return {
    type: "picturechoice",
    id: "colors",
    label: "Balloon colors",
    required: false,
    selection: "many",
    tileSize: "small",
    showLabels: true,
    options: [
      { id: "red", label: "Red", color: "#ff0000" },
      { id: "blue", label: "Blue", color: "#0000ff" },
    ],
    ...overrides,
  };
}

/** A controlled harness: keeps the value like `FormRenderer` does. */
function Harness({
  field,
  initial,
  error,
  onValue,
  registerRef = () => undefined,
}: {
  field: FormPictureChoiceField;
  initial: unknown;
  error?: string;
  onValue?: (value: unknown) => void;
  registerRef?: (el: HTMLElement | null) => void;
}) {
  const [value, setValue] = useState<unknown>(initial);
  const fieldDomId = `form-field-${field.id}`;
  const descriptionId = field.description
    ? `${fieldDomId}-description`
    : undefined;
  const errorId = error ? `${fieldDomId}-error` : undefined;
  return (
    <PictureChoiceField
      field={field}
      value={value}
      fieldDomId={fieldDomId}
      describedBy={
        [descriptionId, errorId].filter(Boolean).join(" ") || undefined
      }
      descriptionId={descriptionId}
      errorId={errorId}
      error={error}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
      registerRef={registerRef}
    />
  );
}

// ─── Legacy layout (no groups, no families, ≤ 24 tiles) ─────────────────────
// These snapshots were recorded against the pre-upgrade component; the
// upgrade must keep old forms byte-for-byte identical.

const LEGACY_OPTIONS: FormPictureOption[] = [
  { id: "red", label: "Red", color: "#ff0000" },
  { id: "photo", label: "Confetti", imageUrl: "https://x.test/confetti.jpg" },
  { id: "seven", label: "7" },
];

describe("PictureChoiceField — legacy layout", () => {
  it("one / small renders unchanged", () => {
    const { container } = render(
      <Harness
        field={makeField({
          selection: "one",
          options: LEGACY_OPTIONS,
          description: "Pick one",
        })}
        initial="photo"
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("many / small with a max renders unchanged (at the max)", () => {
    const { container } = render(
      <Harness
        field={makeField({
          selection: "many",
          options: LEGACY_OPTIONS,
          minTotal: 1,
          maxTotal: 2,
        })}
        initial={["red", "seven"]}
        error="Pick fewer"
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("quantity / large renders unchanged", () => {
    const { container } = render(
      <Harness
        field={makeField({
          selection: "quantity",
          tileSize: "large",
          showLabels: false,
          options: LEGACY_OPTIONS,
          maxTotal: 10,
          referenceImageUrl: "https://x.test/ref.jpg",
        })}
        initial={{ red: 2 }}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("registers the first tile's input for error focus", () => {
    const registerRef = vi.fn();
    render(
      <Harness
        field={makeField({ options: LEGACY_OPTIONS })}
        initial={[]}
        registerRef={registerRef}
      />,
    );
    const last = registerRef.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(last).toBeInstanceOf(HTMLInputElement);
    expect(last.id).toBe("form-field-colors-red");
  });
});

// ─── Browse layout (groups / families / > 24 tiles) ─────────────────────────

/**
 * 30 tiles: 12 Standard (Pinks / Blues), 12 Pearl (Pinks / Metallics, incl.
 * "Pearl Gold" #610), 6 with no / an unknown group ("Other").
 */
function browseOptions(): FormPictureOption[] {
  const options: FormPictureOption[] = [];
  for (let i = 1; i <= 12; i++) {
    options.push({
      id: `standard-${i}`,
      label: `Standard ${i % 2 ? "Pink" : "Blue"} ${i}`,
      code: String(100 + i),
      color: i % 2 ? "#ff99aa" : "#3366ff",
      family: i % 2 ? "Pinks" : "Blues",
      groupId: "standard",
    });
  }
  for (let i = 1; i <= 11; i++) {
    options.push({
      id: `pearl-${i}`,
      label: `Pearl Shade ${i}`,
      code: String(200 + i),
      imageUrl: `https://x.test/pearl-${i}.webp`,
      family: i % 2 ? "Pinks" : "Metallics",
      groupId: "pearl",
    });
  }
  options.push({
    id: "pearl-610-gold",
    label: "Pearl Gold",
    code: "610",
    imageUrl: "https://x.test/pearl-gold.webp",
    family: "Metallics",
    groupId: "pearl",
  });
  for (let i = 1; i <= 6; i++) {
    options.push({
      id: `other-${i}`,
      label: `Odd One ${i}`,
      color: "#00aa00",
      groupId: i === 1 ? "ghost-group" : null,
    });
  }
  return options;
}

function browseField(
  overrides: Partial<FormPictureChoiceField> = {},
): FormPictureChoiceField {
  return makeField({
    options: browseOptions(),
    groups: [
      { id: "standard", label: "Standard", description: "Classic shine" },
      { id: "pearl", label: "Pearl", description: "Soft sheen" },
    ],
    imageFit: "contain",
    maxTotal: 6,
    ...overrides,
  });
}

/** Tile labels currently rendered (in DOM order). */
function tileIds(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll('[data-slot="picture-choice-option"] input'),
  ].map((input) => (input as HTMLInputElement).value || input.id);
}

describe("PictureChoiceField — browse layout", () => {
  it("only switches layout for groups, families or > 24 tiles", async () => {
    const { usesPictureBrowseLayout } = await import("./picture-choice-field");
    const base = { options: LEGACY_OPTIONS };
    expect(usesPictureBrowseLayout(base)).toBe(false);
    expect(usesPictureBrowseLayout({ ...base, groups: [] })).toBe(false);
    expect(
      usesPictureBrowseLayout({
        ...base,
        groups: [{ id: "g", label: "G" }],
      }),
    ).toBe(true);
    expect(
      usesPictureBrowseLayout({
        options: [{ id: "a", label: "A", family: "Reds" }, ...LEGACY_OPTIONS],
      }),
    ).toBe(true);
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `o${i}`,
      label: `O${i}`,
    }));
    expect(usesPictureBrowseLayout({ options: many.slice(0, 24) })).toBe(false);
    expect(usesPictureBrowseLayout({ options: many })).toBe(true);
  });

  it("shows codes under tile names, also in the legacy layout", () => {
    const { container } = render(
      <Harness
        field={makeField({
          options: [
            { id: "gold", label: "Gold", color: "#ffcc00", code: "610" },
            { id: "red", label: "Red", color: "#ff0000" },
          ],
        })}
        initial={[]}
      />,
    );
    const codes = container.querySelectorAll(
      '[data-slot="picture-choice-code"]',
    );
    expect(codes).toHaveLength(1);
    expect(codes[0]).toHaveTextContent("#610");
    // The legacy layout has no tabs / picks strip.
    expect(container.querySelector('[data-layout="browse"]')).toBeNull();
  });

  it("renders group tabs; only the active panel's tiles; headings on All", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness field={browseField()} initial={[]} />,
    );
    const fieldset = container.querySelector("fieldset")!;
    expect(fieldset).toHaveAttribute("data-layout", "browse");
    expect(fieldset).toHaveAttribute("data-image-fit", "contain");

    const tablist = screen.getByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "All",
      "Standard",
      "Pearl",
      "Other",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    // "All": every tile, under a heading per group (+ description).
    expect(tileIds(container)).toHaveLength(30);
    const headings = container.querySelectorAll(
      '[data-slot="picture-choice-group-heading"]',
    );
    expect([...headings].map((h) => h.textContent)).toEqual([
      "Standard",
      "Pearl",
      "Other",
    ]);
    expect(screen.getByText("Classic shine")).toBeInTheDocument();

    await user.click(tabs[2]!);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", tabs[2]!.id);
    const ids = tileIds(container);
    expect(ids).toHaveLength(12);
    expect(ids.every((id) => id.startsWith("pearl-"))).toBe(true);
    expect(
      container.querySelector('[data-slot="picture-choice-group-heading"]'),
    ).toBeNull();
    expect(screen.getByText("Soft sheen")).toBeInTheDocument();

    await user.click(tabs[3]!);
    expect(tileIds(container)).toEqual([
      "other-1",
      "other-2",
      "other-3",
      "other-4",
      "other-5",
      "other-6",
    ]);
  });

  it("moves between tabs with arrows / Home / End (automatic activation)", async () => {
    const user = userEvent.setup();
    render(<Harness field={browseField()} initial={[]} />);
    const tabs = screen.getAllByRole("tab");
    // Roving tabindex: only the selected tab is in the tab order.
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);

    tabs[0]!.focus();
    await user.keyboard("{ArrowRight}");
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{End}");
    expect(tabs[3]).toHaveFocus();
    expect(tabs[3]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(tabs[0]).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(tabs[3]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("badges each tab with its picked count", () => {
    render(
      <Harness
        field={browseField()}
        initial={["pearl-610-gold", "pearl-1", "standard-2"]}
      />,
    );
    expect(screen.getByRole("tab", { name: "All, 3 picked" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Pearl, 2 picked" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Standard, 1 picked" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Other" })).toBeTruthy();
  });

  it("filters by color family within the current tab", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness field={browseField()} initial={[]} />,
    );
    await user.click(screen.getByRole("tab", { name: "Standard" }));
    const group = screen.getByRole("radiogroup", { name: "Color family" });
    const chips = within(group).getAllByRole("radio");
    expect(chips.map((c) => c.textContent)).toEqual(["All", "Pinks", "Blues"]);
    expect(chips[0]).toHaveAttribute("aria-checked", "true");

    await user.click(chips[2]!);
    expect(chips[2]).toHaveAttribute("aria-checked", "true");
    const ids = tileIds(container);
    expect(ids).toHaveLength(6);
    expect(ids.every((id) => Number(id.split("-")[1]) % 2 === 0)).toBe(true);

    // Roving: arrows move the checked chip.
    await user.keyboard("{ArrowLeft}");
    expect(chips[1]).toHaveFocus();
    expect(chips[1]).toHaveAttribute("aria-checked", "true");
    expect(tileIds(container)).toHaveLength(6);
    await user.keyboard("{Home}");
    expect(tileIds(container)).toHaveLength(12);

    // Families follow the tab (Pearl has Pinks + Metallics, first-seen order).
    await user.click(screen.getByRole("tab", { name: "Pearl" }));
    expect(
      within(screen.getByRole("radiogroup", { name: "Color family" }))
        .getAllByRole("radio")
        .map((c) => c.textContent),
    ).toEqual(["All", "Pinks", "Metallics"]);
  });

  it("searches name or #code across every group; Enter never submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <Harness field={browseField()} initial={[]} />
        <button type="submit">Send</button>
      </form>,
    );
    // Start in the Standard tab: a search still looks everywhere.
    await user.click(screen.getByRole("tab", { name: "Standard" }));
    const search = screen.getByRole("searchbox", {
      name: "Search Balloon colors",
    });
    await user.type(search, "#610");
    expect(tileIds(container)).toEqual(["pearl-610-gold"]);
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(search);
    await user.type(search, "pearl gold");
    expect(tileIds(container)).toEqual(["pearl-610-gold"]);

    // Clearing the box goes back to the tab the visitor was on.
    await user.clear(search);
    expect(screen.getByRole("tab", { name: "Standard" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(tileIds(container)).toHaveLength(12);
  });

  it("shows a no-match state that clears search and filters", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness field={browseField()} initial={[]} />,
    );
    await user.click(screen.getByRole("tab", { name: "Pearl" }));
    await user.click(screen.getByRole("radio", { name: "Metallics" }));
    const search = screen.getByRole("searchbox");
    await user.type(search, "zzz");
    const empty = container.querySelector('[data-slot="picture-choice-empty"]');
    expect(empty).toHaveTextContent("No matches for “zzz”");
    expect(tileIds(container)).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Clear search and filters" }),
    );
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(tileIds(container)).toHaveLength(30);
  });

  it("hides search at ≤ 24 tiles", () => {
    render(
      <Harness
        field={makeField({
          options: browseOptions().slice(0, 10),
          groups: [{ id: "standard", label: "Standard" }],
        })}
        initial={[]}
      />,
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByRole("tablist")).toBeTruthy();
  });

  it("lists picks with swatches; remove buttons update the value and focus", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    const { container } = render(
      <Harness
        field={browseField()}
        initial={["pearl-610-gold", "standard-1", "other-2"]}
        onValue={onValue}
      />,
    );
    const list = container.querySelector<HTMLElement>(
      '[data-slot="picture-choice-picks-list"]',
    )!;
    const chips = within(list).getAllByRole("listitem");
    expect(chips.map((c) => c.textContent)).toEqual([
      "Pearl Gold",
      "Standard Pink 1",
      "Odd One 2",
    ]);
    expect(
      chips[0]!.querySelector('[data-slot="picture-choice-pick-swatch"] img'),
    ).toHaveAttribute("src", "https://x.test/pearl-gold.webp");
    expect(screen.getByText("3 of 6 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Pearl Gold" }));
    expect(onValue).toHaveBeenLastCalledWith(["standard-1", "other-2"]);
    expect(
      screen.getByRole("button", { name: "Remove Standard Pink 1" }),
    ).toHaveFocus();
    expect(
      container.querySelector('[data-slot="picture-choice-status"]'),
    ).toHaveTextContent("Pearl Gold removed. 2 of 6 selected.");

    await user.click(screen.getByRole("button", { name: "Remove Odd One 2" }));
    await user.click(
      screen.getByRole("button", { name: "Remove Standard Pink 1" }),
    );
    expect(onValue).toHaveBeenLastCalledWith([]);
    expect(
      container.querySelector('[data-slot="picture-choice-picks-label"]'),
    ).toHaveFocus();
    expect(screen.getByText("Nothing picked yet.")).toBeInTheDocument();
  });

  it("shows quantities on pick chips", () => {
    render(
      <Harness
        field={browseField({ selection: "quantity", maxTotal: 20 })}
        initial={{ "pearl-610-gold": 3, "standard-1": 1 }}
      />,
    );
    const list = screen.getByRole("list");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((c) => c.textContent),
    ).toEqual(["Standard Pink 1× 1", "Pearl Gold× 3"]);
    expect(screen.getByText("4 of 20 chosen")).toBeInTheDocument();
  });

  it("at the max: unpicked tiles are aria-disabled and a click explains", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    const { container } = render(
      <Harness
        field={browseField({ maxTotal: 2 })}
        initial={["standard-1", "standard-2"]}
        onValue={onValue}
      />,
    );
    const blocked = container.querySelector<HTMLInputElement>(
      "#form-field-colors-pearl-610-gold",
    )!;
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).not.toBeDisabled();
    const picked = container.querySelector<HTMLInputElement>(
      "#form-field-colors-standard-1",
    )!;
    expect(picked).not.toHaveAttribute("aria-disabled");

    await user.click(blocked);
    expect(onValue).not.toHaveBeenCalled();
    expect(blocked).not.toBeChecked();
    expect(
      container.querySelector('[data-slot="picture-choice-status"]'),
    ).toHaveTextContent("You can pick up to 2. Remove one to add Pearl Gold.");
    expect(
      container.querySelector('[data-slot="picture-choice-limit"]'),
    ).toBeInTheDocument();

    // Un-picking still works, and frees the blocked tile.
    await user.click(picked);
    expect(onValue).toHaveBeenLastCalledWith(["standard-2"]);
    expect(blocked).not.toHaveAttribute("aria-disabled");
    await user.click(blocked);
    expect(onValue).toHaveBeenLastCalledWith(["standard-2", "pearl-610-gold"]);
  });

  it("shows an externally set (prefilled) value in the strip, even off-tab", async () => {
    const user = userEvent.setup();
    const field = browseField();
    const props = {
      field,
      fieldDomId: "form-field-colors",
      describedBy: undefined,
      descriptionId: undefined,
      errorId: undefined,
      error: undefined,
      onChange: () => undefined,
      registerRef: () => undefined,
    };
    const { rerender } = render(<PictureChoiceField {...props} value={[]} />);
    await user.click(screen.getByRole("tab", { name: "Standard" }));
    expect(screen.getByText("Nothing picked yet.")).toBeInTheDocument();

    // e.g. `?pick=colors:pearl-610-gold,other-3` applied by the renderer.
    rerender(
      <PictureChoiceField {...props} value={["pearl-610-gold", "other-3"]} />,
    );
    const list = screen.getByRole("list", { name: "Your picks" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((c) => c.textContent),
    ).toEqual(["Pearl Gold", "Odd One 3"]);
    expect(screen.getByRole("tab", { name: "Pearl, 1 picked" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Standard" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("registers the always-mounted fieldset for error focus", () => {
    const registerRef = vi.fn();
    render(
      <Harness
        field={browseField()}
        initial={[]}
        error="Pick at least one"
        registerRef={registerRef}
      />,
    );
    const el = registerRef.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(el.tagName).toBe("FIELDSET");
    expect(el.tabIndex).toBe(-1);
    expect(el).toHaveAttribute("aria-describedby", "form-field-colors-error");
  });

  it("keeps radio semantics in one mode (one radiogroup per panel)", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(
      <Harness
        field={browseField({ selection: "one", maxTotal: null })}
        initial=""
        onValue={onValue}
      />,
    );
    // No picks strip in one mode.
    expect(screen.queryByText("Your picks")).toBeNull();
    const groups = screen.getAllByRole("radiogroup", {
      name: "Balloon colors",
    });
    expect(groups).toHaveLength(1);
    expect(within(groups[0]!).getAllByRole("radio")).toHaveLength(30);
    await user.click(screen.getByRole("radio", { name: "Pearl Gold #610" }));
    expect(onValue).toHaveBeenLastCalledWith("pearl-610-gold");
    expect(screen.getByRole("tab", { name: "Pearl, 1 picked" })).toBeTruthy();
  });

  it("lazy-loads tile photos", () => {
    const { container } = render(
      <Harness field={browseField()} initial={[]} />,
    );
    const img = container.querySelector(
      '[data-slot="picture-choice-swatch"] img',
    )!;
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img.className).toContain("object-contain");
  });
});
