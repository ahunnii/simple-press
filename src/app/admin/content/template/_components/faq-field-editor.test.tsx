import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TemplateField } from "~/lib/template-fields";

// `template-field-widgets.tsx` imports `~/trpc/react` at module scope — stub
// it the way other admin component tests do, but this time give
// `faq.adminList` real rows so FaqFieldEditor has something to render.
const FAQ_ITEMS = [
  { id: "q1", question: "What are your hours?", published: true },
  { id: "q2", question: "Do you ship internationally?", published: true },
  { id: "q3", question: "Draft question", published: false },
  { id: "q4", question: "Do you offer refunds?", published: true },
];

vi.mock("~/trpc/react", () => ({
  api: {
    gallery: { list: { useQuery: () => ({ data: undefined }) } },
    faq: { adminList: { useQuery: () => ({ data: FAQ_ITEMS }) } },
    collections: { getAll: { useQuery: () => ({ data: undefined }) } },
  },
}));

const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
);
vi.mock("sonner", () => ({ toast: toastMock }));

import { FaqFieldEditor } from "./template-field-widgets";

type FaqField = Extract<TemplateField, { type: "faq" }>;

function makeField(overrides: Partial<FaqField> = {}): FaqField {
  return {
    key: "faq.picker",
    label: "Questions",
    description: "",
    page: "faq",
    type: "faq",
    ...overrides,
  };
}

/** Controlled harness: feeds every emitted value back in, like the real
 *  field editors do, and records emissions for assertions. */
function Harness({
  field,
  initial,
  onEmit,
}: {
  field: FaqField;
  initial: unknown;
  onEmit?: (ids: unknown) => void;
}) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <FaqFieldEditor
      field={field}
      value={value}
      onChange={(next) => {
        onEmit?.(next);
        setValue(next);
      }}
    />
  );
}

function rowIds() {
  return screen
    .getAllByRole("button")
    .map((el) => el.closest("[data-row-id]"))
    .filter((el): el is HTMLElement => el != null)
    .filter((el, i, arr) => arr.indexOf(el) === i)
    .map((el) => el.dataset.rowId);
}

beforeEach(() => {
  toastMock.mockClear();
});

describe("FaqFieldEditor — rendering", () => {
  it("renders one row per selected id, in order, with the matching question", () => {
    render(
      <Harness field={makeField()} initial={["q2", "q1"]} />,
    );

    const combos = screen.getAllByRole("combobox");
    expect(combos).toHaveLength(2);
    expect(combos[0]).toHaveTextContent("Do you ship internationally?");
    expect(combos[1]).toHaveTextContent("What are your hours?");

    expect(
      screen.getByRole("button", { name: "Reorder question 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "More actions for question 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete question 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reorder question 2" }),
    ).toBeInTheDocument();
  });

  it("shows the empty-state hint and no rows when unset", () => {
    render(<Harness field={makeField()} initial={undefined} />);
    expect(
      screen.getByText(/Showing the first 10 published questions/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("disables Add at maxItems", () => {
    render(
      <Harness
        field={makeField({ maxItems: 2 })}
        initial={["q1", "q2"]}
      />,
    );
    expect(screen.getByRole("button", { name: /Add question/ })).toBeDisabled();
  });

  it("disables delete at minItems", () => {
    render(
      <Harness field={makeField({ minItems: 1 })} initial={["q1"]} />,
    );
    expect(
      screen.getByRole("button", { name: "Delete question 1" }),
    ).toBeDisabled();
  });
});

describe("FaqFieldEditor — reorder", () => {
  it("'Move down' in the ⋯ menu reorders and emits the same string[] format", async () => {
    const user = userEvent.setup();
    const onEmit = vi.fn();
    render(
      <Harness
        field={makeField()}
        initial={["q1", "q2", "q4"]}
        onEmit={onEmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "More actions for question 1" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Move down" }),
    );

    expect(onEmit).toHaveBeenCalledTimes(1);
    const emitted = onEmit.mock.calls[0]![0] as string[];
    expect(emitted).toEqual(["q2", "q1", "q4"]);

    const combos = screen.getAllByRole("combobox");
    expect(combos[0]).toHaveTextContent("Do you ship internationally?");
    expect(combos[1]).toHaveTextContent("What are your hours?");
  });

  it("disables 'Move up' on the first row and 'Move down' on the last", async () => {
    const user = userEvent.setup();
    render(<Harness field={makeField()} initial={["q1", "q2"]} />);

    await user.click(
      screen.getByRole("button", { name: "More actions for question 1" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Move up" }),
    ).toHaveAttribute("data-disabled");
    await user.keyboard("{Escape}");

    await user.click(
      screen.getByRole("button", { name: "More actions for question 2" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Move down" }),
    ).toHaveAttribute("data-disabled");
  });
});

describe("FaqFieldEditor — delete + Undo", () => {
  it("delete removes the row and Undo restores it at its original index", async () => {
    const user = userEvent.setup();
    const onEmit = vi.fn();
    render(
      <Harness
        field={makeField()}
        initial={["q1", "q2", "q4"]}
        onEmit={onEmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete question 2" }),
    );

    expect(onEmit).toHaveBeenCalledTimes(1);
    expect(onEmit.mock.calls[0]![0]).toEqual(["q1", "q4"]);
    expect(toastMock).toHaveBeenCalledTimes(1);
    const [message, options] = toastMock.mock.calls[0]! as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toBe("Question deleted");
    expect(options.action.label).toBe("Undo");

    act(() => options.action.onClick());

    expect(onEmit).toHaveBeenCalledTimes(2);
    expect(onEmit.mock.calls[1]![0]).toEqual(["q1", "q2", "q4"]);
    const combos = screen.getAllByRole("combobox");
    expect(combos[1]).toHaveTextContent("Do you ship internationally?");
  });

  it("clicking Undo twice is a no-op the second time", async () => {
    const user = userEvent.setup();
    const onEmit = vi.fn();
    render(
      <Harness field={makeField()} initial={["q1", "q2"]} onEmit={onEmit} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete question 1" }),
    );
    const [, options] = toastMock.mock.calls[0]! as [
      string,
      { action: { onClick: () => void } },
    ];

    act(() => options.action.onClick());
    expect(onEmit.mock.calls.at(-1)![0]).toEqual(["q1", "q2"]);

    const callsBefore = onEmit.mock.calls.length;
    act(() => options.action.onClick());
    // No new emission — the row was already restored.
    expect(onEmit.mock.calls.length).toBe(callsBefore);
  });
});

describe("FaqFieldEditor — empty (unselected) rows", () => {
  it("keeps an empty row's identity (DOM node) across a reorder", async () => {
    const user = userEvent.setup();
    render(
      <Harness field={makeField()} initial={["q1", "", "q4"]} />,
    );

    const idsBefore = rowIds();
    expect(idsBefore).toHaveLength(3);
    const emptyRowKey = idsBefore[1]!;
    // Non-empty rows are keyed by their FAQ id directly.
    expect(idsBefore[0]).toBe("q1");
    expect(idsBefore[2]).toBe("q4");
    // The empty row got some generated (non-empty-string) stable key.
    expect(emptyRowKey).toBeTruthy();

    const nodeBefore = document.querySelector(
      `[data-row-id="${emptyRowKey}"]`,
    );
    expect(nodeBefore).not.toBeNull();

    // Move the empty (middle) row down via the ⋯ menu.
    await user.click(
      screen.getByRole("button", { name: "More actions for question 2" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Move down" }),
    );

    const idsAfter = rowIds();
    expect(idsAfter).toEqual(["q1", "q4", emptyRowKey]);

    const nodeAfter = document.querySelector(
      `[data-row-id="${emptyRowKey}"]`,
    );
    // Same physical DOM node — React reused it via its stable key instead of
    // remounting (the old `${id}-${rowIndex}` key would have forced a
    // remount here since the row's index changed).
    expect(nodeAfter).toBe(nodeBefore);
  });

  it("adding a row when no more distinct published questions are available uses a stable empty slot", () => {
    render(
      <Harness
        field={makeField()}
        initial={["q1", "q2", "q4"]}
      />,
    );
    // All three published questions are already used elsewhere, so the
    // remaining Select still resolves to a valid combobox per row.
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
  });
});
