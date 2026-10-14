import type { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useFieldArray, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type {
  FormBuilderValues,
  FormDefinitionInput,
  PictureChoiceFieldInput,
  PictureOptionInput,
} from "./builder-shared";
import { formCreateSchema } from "~/lib/validators/form";
import { Form } from "~/components/ui/form";

import {
  makeEmptyBuilderDefinition,
  normalizeBuilderDefinition,
} from "./builder-shared";
import { FormFieldCard } from "./form-field-card";

// The photo widgets pull in the media picker's tRPC client; none of these
// tests open them.
vi.mock("~/components/media/media-picker-dialog", () => ({
  MediaPickerDialog: () => null,
}));
vi.mock(
  "../../content/template/_components/template-media-upload-fields",
  () => ({ TemplateImageUploadField: () => null }),
);

function definitionWith(field: PictureChoiceFieldInput): FormDefinitionInput {
  const definition = makeEmptyBuilderDefinition();
  definition.fields = [field];
  return definition;
}

/** A field as it is STORED today: no groups, codes, families, fit. */
function legacyField(count = 3): PictureChoiceFieldInput {
  return {
    id: "f1",
    type: "picturechoice",
    label: "Colors",
    required: false,
    options: Array.from({ length: count }, (_, i) => ({
      id: `o${i + 1}`,
      label: `Tile ${i + 1}`,
      color: "#ff0000",
    })),
    selection: "many",
  };
}

function groupedField(): PictureChoiceFieldInput {
  return {
    id: "f1",
    type: "picturechoice",
    label: "Colors",
    required: false,
    groups: [
      { id: "g-a", label: "Pearl" },
      { id: "g-b", label: "Standard" },
    ],
    options: [
      { id: "a1", label: "Pearl Gold", code: "610", groupId: "g-a" },
      { id: "b1", label: "White", groupId: "g-b" },
      { id: "a2", label: "Pearl Rose", groupId: "g-a" },
      { id: "u1", label: "Loose" },
    ],
  };
}

let rhfRef: UseFormReturn<FormBuilderValues> | null = null;

function Harness({ definition }: { definition: FormDefinitionInput }) {
  const rhf = useForm<FormBuilderValues>({
    resolver: zodResolver(formCreateSchema),
    mode: "onTouched",
    defaultValues: {
      name: "Quote",
      published: false,
      definition: normalizeBuilderDefinition(definition),
    },
  });
  rhfRef = rhf;
  // Mirrors FormBuilder: the outer field array is what makes RHF treat the
  // tile rows' controllers as array fields (without it, a row whose index
  // changes unregisters its old path and drops that tile's values).
  useFieldArray({ control: rhf.control, name: "definition.fields" });
  const field = rhf.watch("definition.fields.0");
  const isDirty = rhf.formState.isDirty;
  return (
    <Form {...rhf}>
      <form>
        <output data-testid="dirty">{String(isDirty)}</output>
        {field && (
          <FormFieldCard
            form={rhf}
            base="definition.fields.0"
            index={0}
            field={field}
            confirmationFieldId={null}
            open
            onOpenChange={() => undefined}
            onRemove={() => undefined}
            onDuplicate={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
            isFirst
            isLast
            onChangeType={() => undefined}
          />
        )}
      </form>
    </Form>
  );
}

function options(): PictureOptionInput[] {
  const field = rhfRef!.getValues("definition.fields.0");
  if (field?.type !== "picturechoice") throw new Error("wrong type");
  return field.options;
}

function field(): PictureChoiceFieldInput {
  const value = rhfRef!.getValues("definition.fields.0");
  if (value?.type !== "picturechoice") throw new Error("wrong type");
  return value;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("PictureOptionsEditor", () => {
  it("leaves an untouched legacy field clean and key-for-key unchanged", async () => {
    render(<Harness definition={definitionWith(legacyField())} />);
    await settle();

    expect(screen.getByTestId("dirty")).toHaveTextContent("false");
    // Nothing new was written into the stored options or the field.
    for (const option of options()) {
      expect(Object.keys(option).sort()).toEqual([
        "color",
        "id",
        "imageUrl",
        "label",
      ]);
    }
    expect("imageFit" in field()).toBe(false);
    expect("groups" in field()).toBe(false);
    // The image-fit select shows the default without storing it.
    expect(
      screen.getByRole("combobox", { name: "Image fit" }),
    ).toHaveTextContent("Crop to fill");
  });

  it("hiding a tile and showing it again returns the form to clean", async () => {
    render(<Harness definition={definitionWith(legacyField())} />);
    await settle();

    const toggle = screen.getByRole("button", { name: "Hide option 2" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    await settle();
    expect(options()[1]?.hidden).toBe(true);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("dirty")).toHaveTextContent("true");
    expect(screen.getByText(/3 tiles · 1 hidden/)).toBeInTheDocument();

    fireEvent.click(toggle);
    await settle();
    expect("hidden" in options()[1]!).toBe(false);
    expect(screen.getByTestId("dirty")).toHaveTextContent("false");
  });

  it("writes a code without its # and a family, then clears them away", async () => {
    render(<Harness definition={definitionWith(legacyField())} />);
    await settle();

    fireEvent.change(screen.getByRole("textbox", { name: "Option 1 code" }), {
      target: { value: "#610" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Option 1 family" }),
      { target: { value: "Golds" } },
    );
    await settle();
    expect(options()[0]).toMatchObject({ code: "610", family: "Golds" });

    fireEvent.change(screen.getByRole("textbox", { name: "Option 1 code" }), {
      target: { value: "" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Option 1 family" }),
      { target: { value: "" } },
    );
    await settle();
    expect("code" in options()[0]!).toBe(false);
    expect("family" in options()[0]!).toBe(false);
    expect(screen.getByTestId("dirty")).toHaveTextContent("false");
  });

  it("lists tiles by group with the true index behind every row", async () => {
    render(<Harness definition={definitionWith(groupedField())} />);
    await settle();

    const pearl = screen.getByRole("region", { name: "Pearl" });
    expect(within(pearl).getByText(/2 tiles/)).toBeInTheDocument();
    // Pearl Rose is the THIRD tile overall, so its row is option 3.
    expect(
      within(pearl).getByRole("textbox", { name: "Option 3 label" }),
    ).toHaveValue("Pearl Rose");
    expect(
      within(screen.getByRole("region", { name: "Ungrouped" })).getByRole(
        "textbox",
        { name: "Option 4 label" },
      ),
    ).toHaveValue("Loose");
  });

  it("moves a tile within its group past tiles of other groups", async () => {
    render(<Harness definition={definitionWith(groupedField())} />);
    await settle();

    const pearl = screen.getByRole("region", { name: "Pearl" });
    // First and last of the Pearl run can't move further.
    expect(
      within(pearl).getByRole("button", { name: "Move option 1 up" }),
    ).toBeDisabled();
    expect(
      within(pearl).getByRole("button", { name: "Move option 3 down" }),
    ).toBeDisabled();

    fireEvent.click(
      within(pearl).getByRole("button", { name: "Move option 3 up" }),
    );
    await settle();
    expect(options().map((option) => option.id)).toEqual([
      "a2",
      "a1",
      "b1",
      "u1",
    ]);
  });

  it("changing a tile's group appends it to the end of that group's run", async () => {
    render(<Harness definition={definitionWith(groupedField())} />);
    await settle();

    fireEvent.change(screen.getByRole("combobox", { name: "Option 4 group" }), {
      target: { value: "g-a" },
    });
    await settle();
    expect(
      options().map((option) => [option.id, option.groupId ?? null]),
    ).toEqual([
      ["a1", "g-a"],
      ["b1", "g-b"],
      ["a2", "g-a"],
      ["u1", "g-a"],
    ]);
    expect(options().map((option) => option.id)).toEqual([
      "a1",
      "b1",
      "a2",
      "u1",
    ]);

    // And moving the first Pearl tile to Standard puts it after White.
    fireEvent.change(screen.getByRole("combobox", { name: "Option 1 group" }), {
      target: { value: "g-b" },
    });
    await settle();
    expect(options().map((option) => option.id)).toEqual([
      "b1",
      "a1",
      "a2",
      "u1",
    ]);
  });

  it("deleting a group ungroups its tiles first, then removes it", async () => {
    render(<Harness definition={definitionWith(groupedField())} />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: /^Groups/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Delete group 1 \(its 2 tiles/ }),
    );
    await settle();

    expect(field().groups).toEqual([{ id: "g-b", label: "Standard" }]);
    expect(options().map((option) => option.groupId ?? null)).toEqual([
      null,
      "g-b",
      null,
      null,
    ]);
    expect(formCreateSchema.safeParse(rhfRef!.getValues()).success).toBe(true);
    expect(
      within(screen.getByRole("region", { name: "Ungrouped" })).getByText(
        /3 tiles/,
      ),
    ).toBeInTheDocument();
  });

  it("adding a group to a legacy field and deleting it again reads as unchanged", async () => {
    render(<Harness definition={definitionWith(legacyField())} />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: /^Groups/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add group" }));
    await settle();
    expect(field().groups).toHaveLength(1);
    expect(field().groups?.[0]?.label).toBe("Group 1");
    expect(screen.getByTestId("dirty")).toHaveTextContent("true");
    expect(screen.getByRole("textbox", { name: "Group 1 name" })).toHaveValue(
      "Group 1",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Delete group 1/ }));
    await settle();
    expect("groups" in field()).toBe(false);
    expect(screen.getByTestId("dirty")).toHaveTextContent("false");
  });

  it("reorders groups and renames them in place", async () => {
    render(<Harness definition={definitionWith(groupedField())} />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: /^Groups/ }));
    fireEvent.click(screen.getByRole("button", { name: "Move group 2 up" }));
    await settle();
    expect(field().groups?.map((group) => group.id)).toEqual(["g-b", "g-a"]);
    expect(screen.getByRole("textbox", { name: "Group 1 name" })).toHaveValue(
      "Standard",
    );
    expect(screen.getByRole("textbox", { name: "Group 2 name" })).toHaveValue(
      "Pearl",
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Group 2 name" }), {
      target: { value: "Pearl finish" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Group 2 description" }),
      { target: { value: "Soft shimmer" } },
    );
    await settle();
    expect(field().groups?.[1]).toEqual({
      id: "g-a",
      label: "Pearl finish",
      description: "Soft shimmer",
    });
    expect(
      screen.getByRole("region", { name: "Pearl finish" }),
    ).toBeInTheDocument();
  });

  it("hides and shows a whole group", async () => {
    render(<Harness definition={definitionWith(groupedField())} />);
    await settle();

    const pearl = screen.getByRole("region", { name: "Pearl" });
    fireEvent.click(within(pearl).getByRole("button", { name: /Hide all/ }));
    await settle();
    expect(options().map((option) => option.hidden === true)).toEqual([
      true,
      false,
      true,
      false,
    ]);

    fireEvent.click(within(pearl).getByRole("button", { name: /Show all/ }));
    await settle();
    expect(options().some((option) => option.hidden)).toBe(false);
  });

  it("adds new tiles to the group whose section was last opened", async () => {
    const big = groupedField();
    // 26 tiles: past the threshold, so sections start collapsed.
    big.options = [
      ...big.options,
      ...Array.from({ length: 22 }, (_, i) => ({
        id: `x${i}`,
        label: `Extra ${i}`,
        groupId: "g-b",
      })),
    ];
    render(<Harness definition={definitionWith(big)} />);
    await settle();

    // Collapsed: rows aren't mounted.
    expect(
      screen.queryByRole("textbox", { name: "Option 1 label" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Pearl —/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add option" }));
    await settle();
    expect(options().at(-1)?.groupId).toBe("g-a");
    expect(options()).toHaveLength(27);
  });

  it("the filter box opens only the sections with a match", async () => {
    const big = groupedField();
    big.options = [
      ...big.options,
      ...Array.from({ length: 22 }, (_, i) => ({
        id: `x${i}`,
        label: `Extra ${i}`,
        groupId: "g-b",
      })),
    ];
    render(<Harness definition={definitionWith(big)} />);
    await settle();

    const filter = screen.getByRole("searchbox", {
      name: "Filter tiles by name or code",
    });
    fireEvent.change(filter, { target: { value: "#610" } });
    await settle();
    expect(screen.getByRole("textbox", { name: "Option 1 label" })).toHaveValue(
      "Pearl Gold",
    );
    expect(
      screen.queryByRole("region", { name: "Standard" }),
    ).not.toBeInTheDocument();

    // Enter in the filter must not submit the builder's form.
    const submitted = vi.fn((event: Event) => event.preventDefault());
    filter.closest("form")!.addEventListener("submit", submitted);
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(submitted).not.toHaveBeenCalled();
  });
});
