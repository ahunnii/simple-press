import { useState } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TemplateField } from "~/lib/template-fields";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";

// The upload widgets pull in the media picker, whose tRPC client transitively
// imports server-only Prisma setup. Stub it the way
// template-list-field-editor.test does.
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

import { TemplateListFieldEditor } from "~/app/admin/content/template/_components/template-list-field-editor";

type ListField = Extract<TemplateField, { type: "list" }>;

/** Controlled harness, same pattern as
 *  `template-list-field-editor.test.tsx`'s `Harness`: feeds every emitted
 *  value back in, like the real editors do, and records emissions for
 *  assertions. */
function Harness({
  field,
  initial,
  onEmit,
}: {
  field: ListField;
  initial: unknown;
  onEmit?: (rows: unknown) => void;
}) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <TemplateListFieldEditor
      field={field}
      value={value}
      onChange={(next) => {
        onEmit?.(next);
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

/**
 * Regression coverage for dream's `defaultRows` migration (see
 * `./list-defaults.test.ts`): renders the editor against the REAL field
 * definitions from `TEMPLATE_FIELDS.dream` (not a synthetic field) with no
 * saved value, and checks the built-in rows + the "Showing the built-in …"
 * note render. Read-only — `onChange` is asserted not to fire on render.
 */
describe("TemplateListFieldEditor — dream real field defaults", () => {
  const dreamFields = TEMPLATE_FIELDS.dream ?? [];

  function findListField(key: string): ListField {
    const field = dreamFields.find((f) => f.key === key);
    if (!field || field.type !== "list") {
      throw new Error(
        `Expected a list field for key "${key}", found ${JSON.stringify(field)}`,
      );
    }
    return field;
  }

  it("renders the built-in chip labels + note for dream.homepage.quote-chips with no saved value", () => {
    const field = findListField("dream.homepage.quote-chips");
    const onEmit = vi.fn();
    render(<Harness field={field} initial={undefined} onEmit={onEmit} />);

    expect(rowTriggers().map((t) => t.textContent)).toEqual([
      "Date + time",
      "Location",
      "Theme",
      "Colors",
      "Draping",
      "Rentals",
      "Space photos",
      "Full decor?",
    ]);
    expect(
      screen.getByText(
        `Showing the built-in ${field.itemLabel}s — edit any of them to make them your own.`,
      ),
    ).toBeInTheDocument();
    expect(onEmit).not.toHaveBeenCalled();
  });

  it("renders the built-in package names + note for dream.services.packages with no saved value", () => {
    const field = findListField("dream.services.packages");
    const onEmit = vi.fn();
    render(<Harness field={field} initial={undefined} onEmit={onEmit} />);

    expect(rowTriggers().map((t) => t.textContent)).toEqual([
      "Essence",
      "Deluxe",
      "Premium",
      "Lavish",
      "Yasss!",
    ]);
    expect(
      screen.getByText(
        `Showing the built-in ${field.itemLabel}s — edit any of them to make them your own.`,
      ),
    ).toBeInTheDocument();
    expect(onEmit).not.toHaveBeenCalled();
  });
});
