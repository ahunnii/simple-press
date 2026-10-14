"use client";

import type { UseFormReturn } from "react-hook-form";
import { useId, useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { get, useFieldArray, useWatch } from "react-hook-form";

import type {
  FormBuilderValues,
  PictureGroupInput,
  PictureOptionInput,
} from "./builder-shared";
import type { FieldPath } from "./form-field-card";
import { cn } from "~/lib/utils";
import {
  FORM_PICTURE_MAX_GROUPS,
  FORM_PICTURE_MAX_OPTIONS,
} from "~/lib/validators/form";
import { Badge } from "~/components/ui/badge";
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
import {
  makePictureGroup,
  makePictureOption,
  pictureGroupChangeDestination,
  pictureMoveWithinSection,
  pictureOptionMatches,
  pictureSectionIndexes,
  pictureSectionKey,
  UNGROUPED_KEY,
  writeOptionalBuilderValue,
} from "./builder-shared";

const MIN_OPTIONS = 2;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
/** Past this many tiles, sections start collapsed (rows unmounted). */
const COLLAPSE_THRESHOLD = 24;
/** Past this many tiles, the filter box appears. */
const FILTER_THRESHOLD = 12;

/** Native `<select>` styled to sit beside shadcn `Input`s. */
const NATIVE_SELECT_CLASS =
  "border-input dark:bg-input/30 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive";

/** Accepts `#abc`, `abc`, `#aabbcc`, `aabbcc`; returns `#rrggbb` or null. */
function parseHex(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  }
  return HEX_PATTERN.test(value) ? value : null;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** The slice of RHF's error tree this editor reads (unregistered keys). */
type MessageError = { message?: string } | undefined;
type OptionErrors = Record<
  string,
  {
    code?: MessageError;
    family?: MessageError;
    groupId?: MessageError;
  } & Record<string, unknown>
>;
type GroupErrors = Record<
  string,
  { label?: MessageError; description?: MessageError } & Record<string, unknown>
>;

type Props = {
  form: UseFormReturn<FormBuilderValues>;
  base: FieldPath;
  /** Gates "Choose from library" and the bulk "Add photos" button. */
  mediaLibraryEnabled?: boolean;
};

/**
 * Tile editor for a picture-choice field — a fork of the generic
 * `FieldOptionsEditor`, built to stay usable at catalog size (e.g. 106
 * balloon colors in 7 finishes):
 *
 * - a Groups manager (the storefront's tabs) and one collapsible section of
 *   tiles per group, plus "Ungrouped". Past 24 tiles every section starts
 *   collapsed and its rows aren't mounted;
 * - a filter box over label + code that opens the matching sections;
 * - compact rows: label, code, family (datalist), group, hide, color, photo.
 *
 * Rows render from the FULL options array filtered per section, so every
 * field-array operation (`move`, `remove`, writes) uses the tile's true index.
 *
 * The optional tile/group keys (`code`, `family`, `groupId`, `hidden`,
 * `description`) are written with `writeOptionalBuilderValue`, never
 * `FormField`-registered — see that helper for the isDirty trap it avoids.
 *
 * Never nests a `<form>`: the builder preview renders inside the builder's
 * own `<form>`.
 */
export function PictureOptionsEditor({
  form,
  base,
  mediaLibraryEnabled,
}: Props) {
  const name = `${base}.options` as const;
  const groupsName = `${base}.groups` as const;
  const familyListId = useId();
  const filterId = useId();

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name,
  });
  // Groups are NOT a `useFieldArray`: mounting one on an absent path writes
  // the key into the form values, which flips an untouched legacy field to
  // "Unsaved Changes". They're edited as a whole array instead (see
  // `writeGroups`), keyed by their stable ids.

  // `base` is a template-literal path, so RHF types this as the union of every
  // option-carrying field's options; this editor only mounts for picture choice.
  const watched = useWatch({ control: form.control, name }) as
    | PictureOptionInput[]
    | undefined;
  const watchedGroups: PictureGroupInput[] | undefined = useWatch({
    control: form.control,
    name: groupsName,
  });
  const imageFit = useWatch({
    control: form.control,
    name: `${base}.imageFit`,
  }) as string | undefined;

  const options = useMemo(() => watched ?? [], [watched]);
  const groups = useMemo(() => watchedGroups ?? [], [watchedGroups]);
  const groupIds = useMemo(
    () => new Set(groups.map((group) => group.id)),
    [groups],
  );

  const [photoRowsOpen, setPhotoRowsOpen] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Decided once, from the size the field opened at: a big catalog opens
  // with every section collapsed so ~100 rows aren't mounted up front.
  const [collapsedByDefault] = useState(
    () =>
      ((form.getValues(name) as PictureOptionInput[] | undefined)?.length ??
        0) > COLLAPSE_THRESHOLD,
  );
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>(
    {},
  );
  // Where "Add option" / "Add photos" put new tiles: follows the section the
  // owner last expanded or focused; also directly choosable.
  const [targetKey, setTargetKey] = useState<string>(UNGROUPED_KEY);
  const addTarget = groupIds.has(targetKey) ? targetKey : UNGROUPED_KEY;

  const remaining = FORM_PICTURE_MAX_OPTIONS - fields.length;
  const filtering = query.trim().length > 0;

  const optionErrors = get(form.formState.errors, name) as
    | OptionErrors
    | undefined;
  const groupErrors = get(form.formState.errors, groupsName) as
    | GroupErrors
    | undefined;

  const families = useMemo(
    () =>
      [
        ...new Set(
          options
            .map((option) => option.family?.trim())
            .filter((family): family is string => Boolean(family)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [options],
  );

  const sectionCounts = useMemo(() => {
    const counts = new Map<string, { total: number; hidden: number }>();
    for (const option of options) {
      const key = pictureSectionKey(option, groupIds);
      const entry = counts.get(key) ?? { total: 0, hidden: 0 };
      entry.total += 1;
      if (option.hidden) entry.hidden += 1;
      counts.set(key, entry);
    }
    return counts;
  }, [options, groupIds]);

  const sections = [
    ...groups.map((group, groupIndex) => ({
      key: group.id,
      label: group.label.trim() || `Group ${groupIndex + 1}`,
    })),
    {
      key: UNGROUPED_KEY,
      label: groups.length > 0 ? "Ungrouped" : "All tiles",
    },
  ];

  const isOpen = (key: string) => openOverrides[key] ?? !collapsedByDefault;
  const setSectionOpen = (key: string, open: boolean) => {
    setOpenOverrides((previous) => ({ ...previous, [key]: open }));
    if (open) setTargetKey(key);
  };

  const write = (
    path: string,
    value: string | boolean | null | undefined,
    revalidate = true,
  ) => writeOptionalBuilderValue(form, base, path, value, { revalidate });
  const revalidateIfSubmitted = () => {
    if (form.formState.isSubmitted) void form.trigger(base);
  };

  const togglePhotoRow = (rowKey: string) =>
    setPhotoRowsOpen((previous) =>
      previous.includes(rowKey)
        ? previous.filter((key) => key !== rowKey)
        : [...previous, rowKey],
    );

  /** Make freshly added tiles visible: open their section, clear the filter. */
  const revealTarget = () => {
    setOpenOverrides((previous) => ({ ...previous, [addTarget]: true }));
    setQuery("");
  };

  const addOption = () => {
    append(makePictureOption("", addTarget || null));
    revealTarget();
  };

  const addPhotos = (urls: string[]) => {
    const current = options;
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
      return { ...makePictureOption(label, addTarget || null), imageUrl: url };
    });
    if (created.length === 0) return;
    const replaceStarters =
      current.length - starterIndexes.length + created.length >= 2;
    if (replaceStarters && starterIndexes.length > 0) remove(starterIndexes);
    append(
      replaceStarters ? created : created.slice(0, Math.max(remaining, 0)),
    );
    revealTarget();
  };

  const moveWithinSection = (index: number, direction: -1 | 1) => {
    const step = pictureMoveWithinSection(options, index, direction, groupIds);
    if (step) move(step.from, step.to);
  };

  const changeGroup = (index: number, rowKey: string, nextKey: string) => {
    const to = pictureGroupChangeDestination(options, index, nextKey, groupIds);
    write(`${name}.${index}.groupId`, nextKey || null);
    if (to !== index) move(index, to);
    setOpenOverrides((previous) => ({ ...previous, [nextKey]: true }));
    setTargetKey(nextKey);
    // The row re-mounts under its new section; keep the owner's focus on
    // the group select they just used.
    requestAnimationFrame(() => {
      document.getElementById(`${rowKey}-group`)?.focus();
    });
  };

  const setSectionHidden = (sectionKey: string, hidden: boolean) => {
    for (const index of pictureSectionIndexes(options, sectionKey, groupIds)) {
      if (Boolean(options[index]?.hidden) !== hidden) {
        write(`${name}.${index}.hidden`, hidden, false);
      }
    }
    revalidateIfSubmitted();
  };

  const addGroup = () => {
    const taken = new Set(
      groups.map((group) => group.label.trim().toLowerCase()),
    );
    let n = groups.length + 1;
    while (taken.has(`group ${n}`)) n += 1;
    writeGroups([...groups, makePictureGroup(`Group ${n}`)]);
    setGroupsOpen(true);
  };

  /**
   * Replace the whole group list. An empty list deletes the key (so a legacy
   * field that gains and then loses a group reads as unchanged again).
   */
  const writeGroups = (next: PictureGroupInput[]) => {
    if (next.length === 0) {
      form.unregister(groupsName, {
        keepDefaultValue: true,
        keepDirty: true,
        keepTouched: true,
      });
    } else {
      form.setValue(groupsName, next, { shouldDirty: true });
    }
  };

  const moveGroupBy = (groupIndex: number, direction: -1 | 1) => {
    const target = groupIndex + direction;
    const group = groups[groupIndex];
    const other = groups[target];
    if (!group || !other) return;
    const next = [...groups];
    next[groupIndex] = other;
    next[target] = group;
    writeGroups(next);
  };

  const deleteGroup = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (!group) return;
    // Ungroup its tiles FIRST, so no tile is left pointing at a group that
    // no longer exists (the validator would reject the save).
    options.forEach((option, index) => {
      if (option.groupId === group.id) {
        write(`${name}.${index}.groupId`, null, false);
      }
    });
    writeGroups(groups.filter((_, index) => index !== groupIndex));
    if (targetKey === group.id) setTargetKey(UNGROUPED_KEY);
    revalidateIfSubmitted();
  };

  const groupsHaveErrors = Boolean(
    groupErrors && Object.keys(groupErrors).some((key) => /^\d+$/.test(key)),
  );

  const matchingBySection = new Map<string, number[]>();
  for (const section of sections) {
    const indexes = pictureSectionIndexes(options, section.key, groupIds);
    matchingBySection.set(
      section.key,
      filtering
        ? indexes.filter((index) =>
            pictureOptionMatches(options[index]!, query),
          )
        : indexes,
    );
  }
  const anyMatch = [...matchingBySection.values()].some(
    (indexes) => indexes.length > 0,
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Choices</p>
          <p className="text-muted-foreground text-xs">
            Each choice can have a color, a photo, or just a label (like
            &ldquo;7&rdquo;). {plural(fields.length, "tile")}
            {remaining <= 0 ? " — the most a field can hold" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {groups.length > 0 && (
            <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Add to
              <select
                className={cn(NATIVE_SELECT_CLASS, "h-8 max-w-40")}
                value={addTarget}
                onChange={(event) => setTargetKey(event.target.value)}
              >
                {groups.map((group, groupIndex) => (
                  <option key={group.id} value={group.id}>
                    {group.label.trim() || `Group ${groupIndex + 1}`}
                  </option>
                ))}
                <option value={UNGROUPED_KEY}>Ungrouped</option>
              </select>
            </label>
          )}
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
            onClick={addOption}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add option
          </Button>
        </div>
      </div>

      {/* ── Groups manager ─────────────────────────────────────────────── */}
      <div className="rounded-md border">
        <button
          type="button"
          aria-expanded={groupsOpen}
          aria-controls={`${familyListId}-groups`}
          onClick={() => setGroupsOpen((open) => !open)}
          className="focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
              groupsOpen && "rotate-180",
            )}
          />
          <span className="font-medium">Groups</span>
          <span className="text-muted-foreground truncate text-xs">
            {groups.length > 0
              ? `${groups.length} — shown as tabs`
              : "Optional — sort tiles into tabs, like finishes"}
          </span>
          {!groupsOpen && groupsHaveErrors && (
            <Badge variant="destructive" className="ml-auto shrink-0">
              Needs attention
            </Badge>
          )}
        </button>

        {groupsOpen && (
          <div id={`${familyListId}-groups`} className="space-y-2 border-t p-3">
            {groups.map((group, groupIndex) => {
              const count = sectionCounts.get(group.id)?.total ?? 0;
              const descriptionError =
                groupErrors?.[groupIndex]?.description?.message;
              const descriptionId = `${familyListId}-group-${groupIndex}-description`;
              return (
                <div
                  key={group.id}
                  className="bg-muted/40 flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-start"
                >
                  <FormField
                    control={form.control}
                    name={`${groupsName}.${groupIndex}.label`}
                    render={({ field: labelField }) => (
                      <FormItem className="min-w-0 sm:w-48">
                        <FormControl>
                          <Input
                            aria-label={`Group ${groupIndex + 1} name`}
                            placeholder="e.g. Pearl"
                            maxLength={60}
                            {...labelField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      id={descriptionId}
                      aria-label={`Group ${groupIndex + 1} description`}
                      placeholder="Short description (optional)"
                      maxLength={200}
                      value={group.description ?? ""}
                      aria-invalid={descriptionError ? true : undefined}
                      onChange={(event) =>
                        write(
                          `${groupsName}.${groupIndex}.description`,
                          event.target.value,
                        )
                      }
                    />
                    {descriptionError && (
                      <p className="text-destructive text-sm">
                        {descriptionError}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-muted-foreground w-16 text-xs tabular-nums">
                      {plural(count, "tile")}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move group ${groupIndex + 1} up`}
                      disabled={groupIndex === 0}
                      onClick={() => moveGroupBy(groupIndex, -1)}
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
                      aria-label={`Move group ${groupIndex + 1} down`}
                      disabled={groupIndex === groups.length - 1}
                      onClick={() => moveGroupBy(groupIndex, 1)}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/80"
                      aria-label={`Delete group ${groupIndex + 1}${
                        count > 0
                          ? ` (its ${plural(count, "tile")} become ungrouped)`
                          : ""
                      }`}
                      onClick={() => deleteGroup(groupIndex)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Deleting a group keeps its tiles — they move to Ungrouped.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={groups.length >= FORM_PICTURE_MAX_GROUPS}
                onClick={addGroup}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add group
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      {fields.length > FILTER_THRESHOLD && (
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id={filterId}
            type="search"
            aria-label="Filter tiles by name or code"
            placeholder="Filter by name or code"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter would submit the builder's <form>.
              if (event.key === "Enter") event.preventDefault();
              if (event.key === "Escape") setQuery("");
            }}
          />
        </div>
      )}

      {filtering && !anyMatch && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          No tiles match &ldquo;{query.trim()}&rdquo;.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuery("")}
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* ── Sections ───────────────────────────────────────────────────── */}
      {sections.map((section) => {
        const counts = sectionCounts.get(section.key) ?? {
          total: 0,
          hidden: 0,
        };
        const sectionIndexes = pictureSectionIndexes(
          options,
          section.key,
          groupIds,
        );
        const rows = matchingBySection.get(section.key) ?? [];
        // An empty Ungrouped section only shows when there are no groups
        // (then it IS the whole list); empty groups still show so tiles can
        // be added and the owner sees the group exists.
        if (
          section.key === UNGROUPED_KEY &&
          counts.total === 0 &&
          groups.length > 0
        ) {
          return null;
        }
        if (filtering && rows.length === 0) return null;

        const open = filtering || isOpen(section.key);
        const panelId = `${familyListId}-section-${
          section.key ? `g-${section.key}` : "ungrouped"
        }`;
        const sectionHasErrors = sectionIndexes.some(
          (index) => optionErrors?.[index] !== undefined,
        );
        const summary = filtering
          ? `${rows.length} of ${plural(counts.total, "tile")} match`
          : `${plural(counts.total, "tile")}${
              counts.hidden > 0 ? ` · ${counts.hidden} hidden` : ""
            }`;

        return (
          <section
            key={section.key ? `group:${section.key}` : "ungrouped"}
            aria-label={section.label}
            className="rounded-md border"
            onFocus={() => setTargetKey(section.key)}
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={filtering}
                onClick={() => setSectionOpen(section.key, !open)}
                className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                    open && "rotate-180",
                  )}
                />
                <span className="truncate font-medium">{section.label}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  — {summary}
                </span>
                {sectionHasErrors && !open && (
                  <Badge variant="destructive" className="shrink-0">
                    Needs attention
                  </Badge>
                )}
              </button>
              {counts.total > 0 && (
                <div className="flex shrink-0 items-center gap-1">
                  {counts.hidden < counts.total && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSectionHidden(section.key, true)}
                    >
                      <EyeOff className="size-3.5" aria-hidden="true" />
                      Hide all
                      <span className="sr-only"> in {section.label}</span>
                    </Button>
                  )}
                  {counts.hidden > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSectionHidden(section.key, false)}
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                      Show all
                      <span className="sr-only"> in {section.label}</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {open && (
              <div id={panelId} className="space-y-2 border-t p-2">
                {rows.length === 0 ? (
                  <p className="text-muted-foreground px-1 py-2 text-xs">
                    No tiles in this group yet — pick it under &ldquo;Add
                    to&rdquo; and add some, or move tiles here with their group
                    menu.
                  </p>
                ) : (
                  rows.map((optionIndex) => {
                    const optionField = fields[optionIndex];
                    const option = options[optionIndex];
                    if (!optionField || !option) return null;
                    const position = sectionIndexes.indexOf(optionIndex);
                    return (
                      <PictureOptionRow
                        key={optionField.id}
                        form={form}
                        rowKey={optionField.id}
                        rowName={`${name}.${optionIndex}`}
                        optionIndex={optionIndex}
                        option={option}
                        groups={groups}
                        groupIds={groupIds}
                        imageFit={imageFit}
                        familyListId={familyListId}
                        errors={optionErrors?.[optionIndex]}
                        isFirstInSection={position <= 0}
                        isLastInSection={position === sectionIndexes.length - 1}
                        canRemove={fields.length > MIN_OPTIONS}
                        photoOpen={photoRowsOpen.includes(optionField.id)}
                        mediaLibraryEnabled={mediaLibraryEnabled}
                        onTogglePhoto={() => togglePhotoRow(optionField.id)}
                        onMove={(direction) =>
                          moveWithinSection(optionIndex, direction)
                        }
                        onRemove={() => remove(optionIndex)}
                        onGroupChange={(nextKey) =>
                          changeGroup(optionIndex, optionField.id, nextKey)
                        }
                        onWrite={write}
                      />
                    );
                  })
                )}
              </div>
            )}
          </section>
        );
      })}

      <datalist id={familyListId}>
        {families.map((family) => (
          <option key={family} value={family} />
        ))}
      </datalist>

      {/* Array-level errors ("Add at least 2 options", "Leave at least one
          option visible") attach to the options path itself, not to any row. */}
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
          excludeUrls={options
            .map((option) => option.imageUrl)
            .filter((url): url is string => Boolean(url))}
          onSelectMany={addPhotos}
        />
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function PictureOptionRow({
  form,
  rowKey,
  rowName,
  optionIndex,
  option,
  groups,
  groupIds,
  imageFit,
  familyListId,
  errors,
  isFirstInSection,
  isLastInSection,
  canRemove,
  photoOpen,
  mediaLibraryEnabled,
  onTogglePhoto,
  onMove,
  onRemove,
  onGroupChange,
  onWrite,
}: {
  form: UseFormReturn<FormBuilderValues>;
  rowKey: string;
  rowName: `${FieldPath}.options.${number}`;
  optionIndex: number;
  option: PictureOptionInput;
  groups: PictureGroupInput[];
  groupIds: ReadonlySet<string>;
  imageFit: string | undefined;
  familyListId: string;
  errors: OptionErrors[string] | undefined;
  isFirstInSection: boolean;
  isLastInSection: boolean;
  canRemove: boolean;
  photoOpen: boolean;
  mediaLibraryEnabled?: boolean;
  onTogglePhoto: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onGroupChange: (nextKey: string) => void;
  onWrite: (path: string, value: string | boolean | null | undefined) => void;
}) {
  const n = optionIndex + 1;
  const hidden = option.hidden === true;
  const sectionKey = pictureSectionKey(option, groupIds);
  const danglingGroup =
    option.groupId && !groupIds.has(option.groupId) ? option.groupId : null;
  const codeError = errors?.code?.message;
  const familyError = errors?.family?.message;
  const groupError = errors?.groupId?.message;

  return (
    <div
      data-hidden={hidden || undefined}
      className={cn(
        "bg-muted/40 space-y-2 rounded-lg border p-2 transition-opacity",
        hidden && "border-dashed opacity-60 focus-within:opacity-100",
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <TilePreview
          color={option.color ?? null}
          imageUrl={option.imageUrl ?? null}
          label={option.label}
          contain={imageFit === "contain"}
        />

        <FormField
          control={form.control}
          name={`${rowName}.label`}
          render={({ field: labelField }) => (
            <FormItem className="min-w-[9rem] flex-1">
              <FormControl>
                <Input
                  placeholder={`Option ${n}`}
                  aria-label={`Option ${n} label`}
                  {...labelField}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="relative w-24 shrink-0">
          <span
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm"
          >
            #
          </span>
          <Input
            aria-label={`Option ${n} code`}
            placeholder="Code"
            maxLength={17}
            spellCheck={false}
            className="pl-6 font-mono text-xs"
            value={option.code ?? ""}
            aria-invalid={codeError ? true : undefined}
            onChange={(event) => {
              const raw = event.target.value.replace(/^#+/, "");
              onWrite(`${rowName}.code`, raw.trim() ? raw : undefined);
            }}
          />
        </div>

        <Input
          aria-label={`Option ${n} family`}
          placeholder="Family"
          list={familyListId}
          maxLength={40}
          className="w-32 shrink-0"
          value={option.family ?? ""}
          aria-invalid={familyError ? true : undefined}
          onChange={(event) => {
            const raw = event.target.value;
            onWrite(`${rowName}.family`, raw.trim() ? raw : undefined);
          }}
        />

        {(groups.length > 0 || danglingGroup) && (
          <select
            id={`${rowKey}-group`}
            aria-label={`Option ${n} group`}
            className={cn(NATIVE_SELECT_CLASS, "w-36 shrink-0")}
            value={danglingGroup ?? sectionKey}
            aria-invalid={groupError ? true : undefined}
            onChange={(event) => onGroupChange(event.target.value)}
          >
            {groups.map((group, groupIndex) => (
              <option key={group.id} value={group.id}>
                {group.label.trim() || `Group ${groupIndex + 1}`}
              </option>
            ))}
            <option value={UNGROUPED_KEY}>Ungrouped</option>
            {danglingGroup && (
              <option value={danglingGroup}>Missing group</option>
            )}
          </select>
        )}

        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Hide option ${n}`}
            aria-pressed={hidden}
            title={hidden ? "Hidden from visitors" : "Hide from visitors"}
            onClick={() =>
              onWrite(`${rowName}.hidden`, hidden ? undefined : true)
            }
          >
            {hidden ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move option ${n} up`}
            disabled={isFirstInSection}
            onClick={() => onMove(-1)}
          >
            <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move option ${n} down`}
            disabled={isLastInSection}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80"
            aria-label={`Remove option ${n}`}
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {(codeError ?? familyError ?? groupError) && (
        <ul className="text-destructive space-y-0.5 text-sm sm:pl-12">
          {codeError && <li>Code: {codeError}</li>}
          {familyError && <li>Family: {familyError}</li>}
          {groupError && <li>{groupError}</li>}
        </ul>
      )}

      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 sm:pl-12">
        <FormField
          control={form.control}
          name={`${rowName}.color`}
          render={({ field: colorField }) => (
            <FormItem>
              <ColorControl
                value={colorField.value ?? null}
                onChange={colorField.onChange}
                label={`Option ${n} color`}
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
                  onClick={onTogglePhoto}
                >
                  <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {imageField.value ? "Photo" : "Add photo"}
                  <span className="sr-only"> for option {n}</span>
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
                    <span className="sr-only"> photo from option {n}</span>
                  </Button>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {photoOpen && (
        <div className="sm:pl-12">
          <FormField
            control={form.control}
            name={`${rowName}.imageUrl`}
            render={({ field: imageField }) => (
              <FormItem>
                <TemplateImageUploadField
                  value={imageField.value ?? ""}
                  onChange={(url) => imageField.onChange(url || null)}
                  accessibleName={`option ${n} photo`}
                  mediaLibraryEnabled={mediaLibraryEnabled}
                />
              </FormItem>
            )}
          />
        </div>
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
  contain,
}: {
  color: string | null;
  imageUrl: string | null;
  label: string;
  contain: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-background flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border text-sm font-medium",
        imageUrl ? "rounded-md" : "rounded-full",
      )}
      style={!imageUrl && color ? { backgroundColor: color } : undefined}
    >
      {imageUrl ? (
        <AdminThumb
          src={imageUrl}
          alt=""
          loading="lazy"
          className={cn(
            "h-full w-full",
            contain ? "object-contain" : "object-cover",
          )}
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
