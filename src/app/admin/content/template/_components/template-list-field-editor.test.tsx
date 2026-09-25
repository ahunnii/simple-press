import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TemplateField, TemplateListRow } from "~/lib/template-fields";
import { TEMPLATE_LUCIDE_ICON_NAMES } from "~/lib/lucide-template-icons";

// The upload widgets pull in the media picker, whose tRPC client transitively
// imports server-only Prisma setup. Stub it the way field-input.test does.
vi.mock("~/trpc/react", () => ({
  api: {
    gallery: { list: { useQuery: () => ({ data: undefined }) } },
    faq: { adminList: { useQuery: () => ({ data: undefined }) } },
    collections: { getAll: { useQuery: () => ({ data: undefined }) } },
  },
}));

const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
);
vi.mock("sonner", () => ({ toast: toastMock }));

import type { TemplateListFocusRequest } from "./template-list-field-editor";
import { TemplateListFieldEditor } from "./template-list-field-editor";

type ListField = Extract<TemplateField, { type: "list" }>;

function makeField(overrides: Partial<ListField> = {}): ListField {
  return {
    key: "home.values",
    label: "Values",
    description: "",
    page: "homepage",
    type: "list",
    itemLabel: "value",
    itemSchema: [
      {
        key: "title",
        label: "Statement",
        type: "text",
        description: "One short sentence.",
        placeholder: "e.g. Better for you",
      },
      { key: "icon", label: "Icon", type: "icon" },
      {
        key: "body",
        label: "Supporting line",
        type: "textarea",
        optional: true,
      },
    ],
    ...overrides,
  };
}

const THREE_ROWS: TemplateListRow[] = [
  { _id: "a", title: "Alpha", icon: "Leaf", body: "" },
  { _id: "b", title: "", icon: "Leaf", body: "" },
  { _id: "c", title: "Gamma", icon: "Leaf", body: "" },
];

/** Controlled harness: feeds every emitted value back in, like the real
 *  editors do, and records emissions for assertions. */
function Harness({
  field,
  initial,
  onEmit,
  focusRequest,
}: {
  field: ListField;
  initial: unknown;
  onEmit?: (rows: TemplateListRow[]) => void;
  focusRequest?: TemplateListFocusRequest | null;
}) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <TemplateListFieldEditor
      field={field}
      value={value}
      focusRequest={focusRequest}
      onChange={(next) => {
        onEmit?.(next as TemplateListRow[]);
        setValue(next);
      }}
    />
  );
}

function rowTriggers() {
  return screen
    .getAllByRole("button")
    .filter((el) => el.hasAttribute("data-row-trigger"));
}

beforeEach(() => {
  toastMock.mockClear();
});

describe("TemplateListFieldEditor — summaries + open state", () => {
  it("titles rows from their text and falls back to '{ItemLabel} n'", () => {
    render(<Harness field={makeField()} initial={THREE_ROWS} />);
    const titles = rowTriggers().map((t) => t.textContent);
    expect(titles).toEqual(["Alpha", "Value 2", "Gamma"]);
  });

  it("uses summaryKey when given", () => {
    render(
      <Harness
        field={makeField({ summaryKey: "body" })}
        initial={[
          { _id: "a", title: "Alpha", body: "Custom summary" },
          { _id: "b", title: "Beta", body: "  " },
        ]}
      />,
    );
    // Blank summaryKey value falls through to the first text sub-field.
    expect(rowTriggers().map((t) => t.textContent)).toEqual([
      "Custom summary",
      "Beta",
    ]);
  });

  it("starts a single row expanded", () => {
    render(
      <Harness field={makeField()} initial={[THREE_ROWS[0]]} />,
    );
    expect(rowTriggers()[0]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Statement")).toHaveValue("Alpha");
  });

  it("starts multiple rows collapsed and expands on header click", async () => {
    const user = userEvent.setup();
    render(<Harness field={makeField()} initial={THREE_ROWS} />);
    for (const t of rowTriggers()) {
      expect(t).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.queryByLabelText("Statement")).not.toBeInTheDocument();

    await user.click(rowTriggers()[2]!);
    expect(rowTriggers()[2]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Statement")).toHaveValue("Gamma");
  });

  it("shows sub-field description as helper text, not placeholder", () => {
    render(<Harness field={makeField()} initial={[THREE_ROWS[0]]} />);
    const input = screen.getByLabelText("Statement");
    expect(input).toHaveAttribute("placeholder", "e.g. Better for you");
    const help = screen.getByText("One short sentence.");
    expect(help.tagName).toBe("P");
    expect(input).toHaveAttribute("aria-describedby", help.id);
  });

  it("puts icon sub-fields first in the expanded body", () => {
    const { container } = render(
      <Harness field={makeField()} initial={[THREE_ROWS[0]]} />,
    );
    const labels = Array.from(
      container.querySelectorAll("[data-row-body] label"),
    ).map((el) => el.textContent);
    expect(labels).toEqual([
      "Icon",
      "Statement",
      "Supporting line (optional)",
    ]);
  });
});

describe("TemplateListFieldEditor — add / empty state", () => {
  it("appends a row, expands it, and focuses its first text input", async () => {
    const user = userEvent.setup();
    const onEmit = vi.fn();
    render(
      <Harness field={makeField()} initial={THREE_ROWS} onEmit={onEmit} />,
    );
    await user.click(screen.getByRole("button", { name: "Add value" }));

    const emitted = onEmit.mock.calls.at(-1)![0] as TemplateListRow[];
    expect(emitted).toHaveLength(4);
    expect(emitted[3]).toMatchObject({
      title: "",
      icon: TEMPLATE_LUCIDE_ICON_NAMES[0],
      body: "",
    });
    expect(typeof emitted[3]!._id).toBe("string");

    const triggers = rowTriggers();
    expect(triggers[3]).toHaveAttribute("aria-expanded", "true");
    expect(triggers[3]).toHaveTextContent("Value 4");
    await waitFor(() =>
      expect(screen.getByLabelText("Statement")).toHaveFocus(),
    );
  });

  it("shows the empty state + built-in hint when defaultsWhenEmpty", () => {
    render(
      <Harness
        field={makeField({ defaultsWhenEmpty: true })}
        initial={undefined}
      />,
    );
    expect(screen.getByText("No values yet.")).toBeInTheDocument();
    expect(
      screen.getByText(/Your site is showing the built-in values/),
    ).toBeInTheDocument();
  });

  it("replaces the Add button with a note at maxItems", () => {
    render(
      <Harness field={makeField({ maxItems: 3 })} initial={THREE_ROWS} />,
    );
    expect(
      screen.queryByRole("button", { name: "Add value" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Maximum of 3 values")).toBeInTheDocument();
  });
});

describe("TemplateListFieldEditor — reorder / delete", () => {
  it("'Move down' in the ⋯ menu reorders and keeps _ids", async () => {
    const user = userEvent.setup();
    const onEmit = vi.fn();
    render(
      <Harness field={makeField()} initial={THREE_ROWS} onEmit={onEmit} />,
    );
    await user.click(
      screen.getByRole("button", { name: "More actions for Alpha" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Move down" }));

    const emitted = onEmit.mock.calls.at(-1)![0] as TemplateListRow[];
    expect(emitted.map((r) => r._id)).toEqual(["b", "a", "c"]);
    expect(emitted[1]).toEqual(THREE_ROWS[0]);
    expect(rowTriggers().map((t) => t.textContent)).toEqual([
      "Value 1",
      "Alpha",
      "Gamma",
    ]);
  });

  it("disables 'Move up' on the first row", async () => {
    const user = userEvent.setup();
    render(<Harness field={makeField()} initial={THREE_ROWS} />);
    await user.click(
      screen.getByRole("button", { name: "More actions for Alpha" }),
    );
    const moveUp = await screen.findByRole("menuitem", { name: "Move up" });
    expect(moveUp).toHaveAttribute("data-disabled");
  });

  it("disables delete at minItems", () => {
    render(
      <Harness field={makeField({ minItems: 3 })} initial={THREE_ROWS} />,
    );
    expect(screen.getByRole("button", { name: "Delete Alpha" })).toBeDisabled();
  });

  it("delete + Undo restores the row at its original index", async () => {
    const user = userEvent.setup();
    const onEmit = vi.fn();
    render(
      <Harness field={makeField()} initial={THREE_ROWS} onEmit={onEmit} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete Value 2" }));
    expect(
      (onEmit.mock.calls.at(-1)![0] as TemplateListRow[]).map((r) => r._id),
    ).toEqual(["a", "c"]);
    expect(toastMock).toHaveBeenCalledTimes(1);
    const [message, options] = toastMock.mock.calls[0]! as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toBe("Value deleted");
    expect(options.action.label).toBe("Undo");

    // An edit after the delete must survive the Undo.
    await user.click(rowTriggers()[1]!);
    const statement = screen.getByLabelText("Statement");
    await user.clear(statement);
    await user.type(statement, "Gee");

    act(() => options.action.onClick());

    const restored = onEmit.mock.calls.at(-1)![0] as TemplateListRow[];
    expect(restored.map((r) => r._id)).toEqual(["a", "b", "c"]);
    expect(restored[2]!.title).toBe("Gee");
  });
});

describe("TemplateListFieldEditor — focusRequest", () => {
  it("expands and focuses the requested row", async () => {
    const field = makeField();
    const { rerender } = render(
      <Harness field={field} initial={THREE_ROWS} focusRequest={null} />,
    );
    expect(rowTriggers()[1]).toHaveAttribute("aria-expanded", "false");

    rerender(
      <Harness
        field={field}
        initial={THREE_ROWS}
        focusRequest={{ itemIndex: 1, nonce: 1 }}
      />,
    );
    expect(rowTriggers()[1]).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(screen.getByLabelText("Statement")).toHaveFocus(),
    );
  });

  it("ignores an out-of-range index", () => {
    render(
      <Harness
        field={makeField()}
        initial={THREE_ROWS}
        focusRequest={{ itemIndex: 9, nonce: 1 }}
      />,
    );
    for (const t of rowTriggers()) {
      expect(t).toHaveAttribute("aria-expanded", "false");
    }
  });
});

describe("TemplateListFieldEditor — keyboard drag", () => {
  it("exposes an accessible sortable drag handle per row", () => {
    render(<Harness field={makeField()} initial={THREE_ROWS} />);
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("reorders with Space / ArrowDown / Space on the handle", async () => {
    // happy-dom has no layout (every rect is 0×0), and dnd-kit's keyboard
    // coordinates resolve targets from measured rects — so give each row a
    // 48px-tall rect by DOM order for the duration of this test.
    const ROW_H = 48;
    const spy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        const rowEl = this.closest("[data-row-id]");
        const i = rowEl
          ? Array.from(
              rowEl.parentElement?.querySelectorAll(":scope > [data-row-id]") ??
                [],
            ).indexOf(rowEl)
          : 0;
        const top = Math.max(0, i) * ROW_H;
        return {
          x: 0,
          y: top,
          top,
          left: 0,
          right: 300,
          bottom: top + ROW_H,
          width: 300,
          height: ROW_H,
          toJSON: () => ({}),
        } as DOMRect;
      });
    try {
      const onEmit = vi.fn();
      render(
        <Harness field={makeField()} initial={THREE_ROWS} onEmit={onEmit} />,
      );
      const handle = screen.getByRole("button", { name: "Reorder Alpha" });
      handle.focus();
      fireEvent.keyDown(handle, { code: "Space", key: " " });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      fireEvent.keyDown(document.activeElement ?? handle, {
        code: "ArrowDown",
        key: "ArrowDown",
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      fireEvent.keyDown(document.activeElement ?? handle, {
        code: "Space",
        key: " ",
      });
      await waitFor(() => expect(onEmit).toHaveBeenCalled());
      const emitted = onEmit.mock.calls.at(-1)![0] as TemplateListRow[];
      expect(emitted.map((r) => r._id)).toEqual(["b", "a", "c"]);
    } finally {
      spy.mockRestore();
    }
  });
});
