"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { ChevronDown, ImageIcon, Images, Plus, Trash2, X } from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";

import type { FormBuilderValues, PictureOptionInput } from "./builder-shared";
import type { FieldPath } from "./form-field-card";
import { cn } from "~/lib/utils";
import { FORM_PICTURE_MAX_OPTIONS } from "~/lib/validators/form";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

import { AdminThumb } from "../../_components/admin-thumb";
import { TemplateImageUploadField } from "../../content/template/_components/template-media-upload-fields";
import { makePictureOption } from "./builder-shared";

const MIN_OPTIONS = 2;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** Accepts `#abc`, `abc`, `#aabbcc`, `aabbcc`; returns `#rrggbb` or null. */
function parseHex(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  }
  return HEX_PATTERN.test(value) ? value : null;
}

type Props = {
  form: UseFormReturn<FormBuilderValues>;
  base: FieldPath;
  /** Gates "Choose from library" and the bulk "Add photos" button. */
  mediaLibraryEnabled?: boolean;
};

/**
 * Tile editor for a picture-choice field — a fork of the generic
 * `FieldOptionsEditor`. Each row is a swatch preview + label + optional color
 * and optional photo (both are presentation only; the label stays the stored
 * key). Never nests a `<form>`: the builder preview renders inside the
 * builder's own `<form>`.
 */
export function PictureOptionsEditor({
  form,
  base,
  mediaLibraryEnabled,
}: Props) {
  const name = `${base}.options` as const;

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name,
  });
  // `base` is a template-literal path, so RHF types this as the union of every
  // option-carrying field's options; this editor only mounts for picture choice.
  const watched = useWatch({ control: form.control, name }) as
    | PictureOptionInput[]
    | undefined;

  const [photoRowsOpen, setPhotoRowsOpen] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const remaining = FORM_PICTURE_MAX_OPTIONS - fields.length;

  const togglePhotoRow = (rowKey: string) =>
    setPhotoRowsOpen((previous) =>
      previous.includes(rowKey)
        ? previous.filter((key) => key !== rowKey)
        : [...previous, rowKey],
    );

  const addPhotos = (urls: string[]) => {
    const current = watched ?? [];
    // Untouched "Option N" starters (no color, no photo) are placeholders from
    // makeField; a bulk photo add replaces them instead of leaving two blank
    // tiles for the owner to delete — as long as at least 2 options remain.
    const starterIndexes = current.flatMap((option, index) =>
      /^Option \d+$/.test(option.label.trim()) &&
      !option.color &&
      !option.imageUrl
        ? [index]
        : [],
    );
    const starters = new Set(starterIndexes);
    const taken = new Set(
      current
        .filter((_, index) => !starters.has(index))
        .map((option) => option.label.trim().toLowerCase()),
    );
    const capacity = Math.max(remaining + starterIndexes.length, 0);
    let next = 1;
    const created = urls.slice(0, capacity).map((url) => {
      while (taken.has(String(next))) next += 1;
      const label = String(next);
      taken.add(label);
      return { ...makePictureOption(label), imageUrl: url };
    });
    if (created.length === 0) return;
    const replaceStarters =
      current.length - starterIndexes.length + created.length >= 2;
    if (replaceStarters && starterIndexes.length > 0) remove(starterIndexes);
    append(
      replaceStarters ? created : created.slice(0, Math.max(remaining, 0)),
    );
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Choices</p>
          <p className="text-muted-foreground text-xs">
            Each choice can have a color, a photo, or just a label (like
            &ldquo;7&rdquo;).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mediaLibraryEnabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={remaining <= 0}
              onClick={() => setBulkOpen(true)}
            >
              <Images className="mr-2 h-4 w-4" aria-hidden="true" />
              Add photos
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={remaining <= 0}
            onClick={() => append(makePictureOption())}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add option
          </Button>
        </div>
      </div>

      {fields.map((optionField, optionIndex) => {
        const option = watched?.[optionIndex];
        const color = option?.color ?? null;
        const imageUrl = option?.imageUrl ?? null;
        const photoOpen = photoRowsOpen.includes(optionField.id);
        const rowName = `${name}.${optionIndex}` as const;

        return (
          <div
            key={optionField.id}
            className="bg-muted/40 space-y-3 rounded-lg border p-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <TilePreview
                color={color}
                imageUrl={imageUrl}
                label={option?.label ?? ""}
              />

              <FormField
                control={form.control}
                name={`${rowName}.label`}
                render={({ field: labelField }) => (
                  <FormItem className="min-w-0 flex-1">
                    <FormControl>
                      <Input
                        placeholder={`Option ${optionIndex + 1}`}
                        aria-label={`Option ${optionIndex + 1} label`}
                        {...labelField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move option ${optionIndex + 1} up`}
                  disabled={optionIndex === 0}
                  onClick={() => move(optionIndex, optionIndex - 1)}
                >
                  <ChevronDown
                    className="h-4 w-4 rotate-180"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move option ${optionIndex + 1} down`}
                  disabled={optionIndex === fields.length - 1}
                  onClick={() => move(optionIndex, optionIndex + 1)}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/80"
                  aria-label={`Remove option ${optionIndex + 1}`}
                  disabled={fields.length <= MIN_OPTIONS}
                  onClick={() => remove(optionIndex)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-x-6 gap-y-3 sm:pl-[3.25rem]">
              <FormField
                control={form.control}
                name={`${rowName}.color`}
                render={({ field: colorField }) => (
                  <FormItem>
                    <ColorControl
                      value={colorField.value ?? null}
                      onChange={colorField.onChange}
                      label={`Option ${optionIndex + 1} color`}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${rowName}.imageUrl`}
                render={({ field: imageField }) => (
                  <FormItem className="min-w-0">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-expanded={photoOpen}
                        onClick={() => togglePhotoRow(optionField.id)}
                      >
                        <ImageIcon
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        {imageField.value ? "Photo" : "Add photo"}
                        <span className="sr-only">
                          {" "}
                          for option {optionIndex + 1}
                        </span>
                      </Button>
                      {imageField.value ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground h-8 px-2 text-xs"
                          onClick={() => imageField.onChange(null)}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          Remove
                          <span className="sr-only">
                            {" "}
                            photo from option {optionIndex + 1}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {photoOpen && (
              <div className="sm:pl-[3.25rem]">
                <FormField
                  control={form.control}
                  name={`${rowName}.imageUrl`}
                  render={({ field: imageField }) => (
                    <FormItem>
                      <TemplateImageUploadField
                        value={imageField.value ?? ""}
                        onChange={(url) => imageField.onChange(url || null)}
                        accessibleName={`option ${optionIndex + 1} photo`}
                        mediaLibraryEnabled={mediaLibraryEnabled}
                      />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Array-level errors ("Add at least 2 options", duplicate labels)
          attach to the options path itself, not to any row. */}
      <FormField
        control={form.control}
        name={name}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />

      {mediaLibraryEnabled && (
        <MediaPickerDialog
          kind="image"
          multiple
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          maxSelect={Math.max(remaining, 0)}
          excludeUrls={(watched ?? [])
            .map((option) => option.imageUrl)
            .filter((url): url is string => Boolean(url))}
          onSelectMany={addPhotos}
        />
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/** What the visitor will see: photo first, then color, then the label chip. */
function TilePreview({
  color,
  imageUrl,
  label,
}: {
  color: string | null;
  imageUrl: string | null;
  label: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-background flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border text-sm font-medium",
        imageUrl ? "rounded-md" : "rounded-full",
      )}
      style={!imageUrl && color ? { backgroundColor: color } : undefined}
    >
      {imageUrl ? (
        <AdminThumb
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : color ? null : (
        <span className="text-muted-foreground">
          {label.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}

/**
 * Native color picker + hex text + Clear (same shape as the template field
 * editor's color widget). Native color inputs have no empty state, so an
 * unset color shows a neutral "None" and `null` is written back on Clear.
 * The hex box keeps a local draft so a half-typed value doesn't fight the
 * owner; it commits once it parses and resets on blur.
 */
function ColorControl({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value ?? "";

  return (
    <div className="flex items-center gap-2">
      <Input
        type="color"
        aria-label={label}
        value={value ?? "#000000"}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        className={cn(
          "h-9 w-12 shrink-0 cursor-pointer p-1",
          !value && "opacity-50",
        )}
      />
      <Input
        aria-label={`${label} (hex)`}
        value={shown}
        placeholder="No color"
        maxLength={7}
        spellCheck={false}
        className="w-28 font-mono text-xs uppercase"
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = parseHex(raw);
          if (parsed) onChange(parsed);
          else if (raw.trim() === "") onChange(null);
        }}
        onBlur={() => setDraft(null)}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 px-2 text-xs"
          onClick={() => {
            setDraft(null);
            onChange(null);
          }}
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear
          <span className="sr-only"> {label}</span>
        </Button>
      ) : null}
    </div>
  );
}
