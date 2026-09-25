import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TemplateField } from "~/lib/template-fields";
import { isFieldVisible } from "~/lib/template-fields";

// `template-field-widgets.tsx` imports `~/trpc/react` at module scope (for
// the gallery/FAQ/collection field types) — none of the cases below render
// those types, but the import still runs, and the real client transitively
// pulls in server-only Prisma setup. Stub it the way other admin component
// tests do.
vi.mock("~/trpc/react", () => ({
  api: {
    gallery: { list: { useQuery: () => ({ data: undefined }) } },
    faq: { adminList: { useQuery: () => ({ data: undefined }) } },
    collections: { getAll: { useQuery: () => ({ data: undefined }) } },
  },
}));

import { FieldInput } from "./template-field-widgets";

/** Builds a minimal `TemplateField` — every case below overrides `type` plus
 *  whatever else it needs; the rest are placeholder-safe defaults. */
function makeField(overrides: Partial<TemplateField> = {}): TemplateField {
  return {
    key: "test.field",
    label: "Test field",
    description: "",
    page: "global",
    type: "text",
    ...overrides,
  } as TemplateField;
}

describe("FieldInput — boolean default", () => {
  it("renders checked when unsaved and defaultValue is \"true\"", () => {
    const field = makeField({
      key: "b1",
      label: "Toggle",
      type: "boolean",
      defaultValue: "true",
    });
    render(
      <FieldInput
        field={field}
        value={undefined}
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("renders unchecked when explicitly saved \"false\", even though the default is \"true\"", () => {
    const field = makeField({
      key: "b1",
      label: "Toggle",
      type: "boolean",
      defaultValue: "true",
    });
    render(
      <FieldInput
        field={field}
        value="false"
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("gives the Switch an id so the Label's htmlFor resolves", () => {
    const field = makeField({ key: "b1", type: "boolean" });
    render(
      <FieldInput
        field={field}
        value={undefined}
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("id", "b1");
  });
});

describe("FieldInput — text default/unsaved behavior", () => {
  it("shows the template default when the key was never saved", () => {
    const field = makeField({
      key: "t1",
      type: "text",
      defaultValue: "Hello there",
    });
    render(
      <FieldInput
        field={field}
        value={undefined}
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Hello there");
  });

  it("shows empty when the owner explicitly saved an empty string", () => {
    const field = makeField({
      key: "t1",
      type: "text",
      defaultValue: "Hello there",
    });
    render(
      <FieldInput
        field={field}
        value=""
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("never calls onChange on mount just because the field is unsaved", () => {
    const onChange = vi.fn();
    const field = makeField({
      key: "t1",
      type: "text",
      defaultValue: "Hello there",
    });
    render(
      <FieldInput
        field={field}
        value={undefined}
        isModified={false}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("FieldInput — description placement and placeholder", () => {
  it("links the description via aria-describedby and renders it before the input in DOM order", () => {
    const field = makeField({
      key: "t2",
      type: "text",
      description: "Helper copy",
    });
    render(
      <FieldInput
        field={field}
        value=""
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    const descId = input.getAttribute("aria-describedby");
    expect(descId).toBeTruthy();

    const desc = document.getElementById(descId!);
    expect(desc).toHaveTextContent("Helper copy");

    const relation = desc!.compareDocumentPosition(input);
    // input FOLLOWS desc in the tree → desc was rendered first.
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not fall back to the description for the placeholder", () => {
    const field = makeField({
      key: "t3",
      type: "text",
      description: "Helper copy",
    });
    render(
      <FieldInput
        field={field}
        value=""
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("placeholder")).not.toBe("Helper copy");
    expect(input.getAttribute("placeholder")).toBeFalsy();
  });

  it("uses an explicit placeholder when one is set", () => {
    const field = makeField({
      key: "t4",
      type: "text",
      description: "Helper copy",
      placeholder: "e.g. Acme Co.",
    });
    render(
      <FieldInput
        field={field}
        value=""
        isModified={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "placeholder",
      "e.g. Acme Co.",
    );
  });
});

describe("FieldInput — number slider", () => {
  it("shows the default position/readout when unsaved, and only commits on Reset (not per render)", async () => {
    const onChange = vi.fn();
    const field = makeField({
      key: "n1",
      type: "number",
      defaultValue: "40",
      min: 0,
      max: 100,
      step: 5,
      unit: "%",
      control: "slider",
    });
    render(
      <FieldInput
        field={field}
        value={undefined}
        isModified={false}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("isFieldVisible", () => {
  it("is always visible when the field has no visibleWhen", () => {
    const field = makeField({ key: "plain" });
    expect(isFieldVisible(field, {}, {})).toBe(true);
  });

  it("falls back to the controlling field's defaultValue when its own value is unset", () => {
    const controlling = makeField({
      key: "mode",
      type: "text",
      defaultValue: "simple",
    });
    const gated = makeField({
      key: "advanced",
      type: "text",
      visibleWhen: { key: "mode", equals: "advanced" },
    });
    const fieldsByKey = { mode: controlling, advanced: gated };

    expect(isFieldVisible(gated, {}, fieldsByKey)).toBe(false);
    expect(isFieldVisible(gated, { mode: "advanced" }, fieldsByKey)).toBe(
      true,
    );
  });

  it("uses the saved value over the controlling field's default when present", () => {
    const controlling = makeField({
      key: "mode2",
      type: "text",
      defaultValue: "advanced",
    });
    const gated = makeField({
      key: "g2",
      type: "text",
      visibleWhen: { key: "mode2", equals: "advanced" },
    });
    const fieldsByKey = { mode2: controlling, g2: gated };

    // Unset → falls back to default "advanced" → visible.
    expect(isFieldVisible(gated, {}, fieldsByKey)).toBe(true);
    // Explicitly saved "" → does NOT fall back to the default; "" !== "advanced".
    expect(isFieldVisible(gated, { mode2: "" }, fieldsByKey)).toBe(false);
    // Explicitly saved a different value wins over the default too.
    expect(isFieldVisible(gated, { mode2: "simple" }, fieldsByKey)).toBe(
      false,
    );
  });
});
