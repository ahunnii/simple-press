import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { FieldFocusRequest } from "./field-panel";
import type * as TemplateFieldsModule from "~/lib/template-fields";
import type { TemplateField } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

import { FieldPanel } from "./field-panel";

const FIELDS: TemplateField[] = [
  {
    key: "t.hero-title",
    label: "Title",
    description: "",
    page: "homepage",
    group: "homepage.hero",
    type: "text",
  },
  {
    key: "t.hero-badges",
    label: "Badges",
    description: "",
    page: "homepage",
    group: "homepage.hero",
    type: "list",
    itemSchema: [{ key: "title", label: "Title", type: "text" }],
  },
  {
    key: "t.hero-subtitle",
    label: "Subtitle",
    description: "",
    page: "homepage",
    group: "homepage.hero",
    type: "text",
    visibleWhen: { key: "t.show-subtitle", equals: "true" },
  },
];

vi.mock("~/lib/template-fields", async (importOriginal) => {
  const actual = await importOriginal<typeof TemplateFieldsModule>();
  return {
    ...actual,
    groupFieldsByPage: () => ({ homepage: FIELDS }),
    getGroupMetadata: () => undefined,
  };
});

// The real widgets pull in tRPC, TipTap, dnd-kit… — the panel only needs to
// render one focusable control per field and forward `listFocusRequest`.
vi.mock(
  "~/app/admin/content/template/_components/template-field-widgets",
  () => ({
    FieldInput: ({
      field,
      listFocusRequest,
    }: {
      field: TemplateField;
      listFocusRequest?: { itemIndex?: number; nonce: number } | null;
    }) => (
      <div
        data-testid={`field-${field.key}`}
        data-list-request={JSON.stringify(listFocusRequest ?? null)}
      >
        <input type="hidden" name={`${field.key}-hidden`} />
        <input aria-label={field.label} />
      </div>
    ),
  }),
);

const SECTION: TemplateSection = {
  id: "homepage.hero",
  page: "homepage",
  title: "Hero",
  groupIds: ["homepage.hero"],
  order: 0,
};

function renderPanel(
  focusRequest: FieldFocusRequest | null,
  fields: Record<string, unknown> = {},
) {
  return render(
    <FieldPanel
      section={SECTION}
      templateId="test"
      fields={fields}
      publishedFields={{}}
      onFieldChange={() => undefined}
      embedsEnabled={false}
      mediaEnabled={false}
      enabledFeatures={new Set()}
      onClose={() => undefined}
      focusRequest={focusRequest}
    />,
  );
}

describe("FieldPanel focusRequest", () => {
  it("wraps each field in a data-field-key element", () => {
    const { container } = renderPanel(null);
    const keys = [...container.querySelectorAll("[data-field-key]")].map(
      (el) => (el as HTMLElement).dataset.fieldKey,
    );
    // The visibleWhen-hidden subtitle is not rendered.
    expect(keys).toEqual(["t.hero-title", "t.hero-badges"]);
  });

  it("focuses the first visible control of a non-list field", async () => {
    renderPanel({ fieldKey: "t.hero-title", nonce: 1 });
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
  });

  it("hands a list field its row request instead of focusing directly", async () => {
    renderPanel(
      { fieldKey: "t.hero-badges", itemIndex: 1, nonce: 7 },
      { "t.hero-badges": [{ _id: "a" }, { _id: "b" }] },
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("field-t.hero-badges").dataset.listRequest,
      ).toBe(JSON.stringify({ itemIndex: 1, nonce: 7 })),
    );
    expect(screen.getByTestId("field-t.hero-title").dataset.listRequest).toBe(
      "null",
    );
    expect(screen.getByLabelText("Badges")).not.toHaveFocus();
  });

  it("does nothing for a field hidden by visibleWhen or absent", async () => {
    const { rerender } = renderPanel({
      fieldKey: "t.hero-subtitle",
      nonce: 1,
    });
    rerender(
      <FieldPanel
        section={SECTION}
        templateId="test"
        fields={{}}
        publishedFields={{}}
        onFieldChange={() => undefined}
        embedsEnabled={false}
        mediaEnabled={false}
        enabledFeatures={new Set()}
        onClose={() => undefined}
        focusRequest={{ fieldKey: "t.not-here", nonce: 2 }}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(document.activeElement).toBe(document.body);
  });
});
