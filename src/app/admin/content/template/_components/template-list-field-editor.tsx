/**
 * Sortable, collapsible editor for storefront-template `list` fields.
 *
 * Every row is a one-line summary header (drag handle · icon/thumbnail
 * preview · summary text · chevron · ⋯ menu · delete) that expands into its
 * sub-fields. Used by `FieldInput` (admin template page + visual-editor
 * sidebar / bottom sheet) for every `type: "list"` template field.
 *
 * Stored format is unchanged from the previous editor: `onChange` receives an
 * array of `TemplateListRow` objects, each carrying its `_id`.
 *
 * `ListItemSubFieldInput` lives here (not in `template-field-widgets.tsx`) so
 * the widgets module can import this editor without a circular import; the
 * widgets module re-exports both.
 */
"use client";

import type {
  Announcements,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type {
  TemplateField,
  TemplateListItemField,
  TemplateListRow,
} from "~/lib/template-fields";
import {
  getLucideTemplateIcon,
  TEMPLATE_LUCIDE_ICON_NAMES,
} from "~/lib/lucide-template-icons";
import { getListRowSummary, parseTemplateListRows } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

import { AdminThumb } from "../../../_components/admin-thumb";
import {
  TemplateImageUploadField,
  TemplateVideoUploadField,
} from "./template-media-upload-fields";

// ─── ListItemSubFieldInput ────────────────────────────────────────────────────

/** "ShieldCheck" → "Shield check": splits PascalCase into words, lowercases
 *  every word after the first. Display-only — stored values are untouched. */
function formatIconLabel(name: string): string {
  const words = name.match(/[A-Z][a-z0-9]*/g) ?? [name];
  return words.map((word, i) => (i === 0 ? word : word.toLowerCase())).join(" ");
}

export function ListItemSubFieldInput({
  subField,
  value,
  onChange,
  mediaLibraryEnabled,
}: {
  subField: TemplateListItemField;
  value: string;
  onChange: (v: string) => void;
  mediaLibraryEnabled?: boolean;
}) {
  const baseId = useId();
  const fieldId = `${baseId}-${subField.key}`;
  const descId = subField.description ? `${fieldId}-desc` : undefined;

  const labelNode = (
    <Label htmlFor={fieldId} className="text-muted-foreground text-xs">
      {subField.label}
      {subField.optional && (
        <span className="text-muted-foreground/70"> (optional)</span>
      )}
    </Label>
  );

  const descNode = subField.description ? (
    <p id={descId} className="text-muted-foreground text-xs">
      {subField.description}
    </p>
  ) : null;

  if (subField.type === "textarea") {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <Textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={subField.placeholder}
          aria-describedby={descId}
          rows={3}
        />
        {descNode}
      </div>
    );
  }

  if (subField.type === "image") {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <TemplateImageUploadField
          value={value}
          onChange={onChange}
          mediaLibraryEnabled={mediaLibraryEnabled}
        />
        {descNode}
      </div>
    );
  }

  if (subField.type === "video") {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <TemplateVideoUploadField
          value={value}
          onChange={onChange}
          mediaLibraryEnabled={mediaLibraryEnabled}
        />
        {descNode}
      </div>
    );
  }

  if (subField.type === "icon") {
    const selected = value || TEMPLATE_LUCIDE_ICON_NAMES[0];
    const Preview = getLucideTemplateIcon(selected ?? "");
    return (
      <div className="space-y-1.5">
        {labelNode}
        <div className="flex items-center gap-2">
          {Preview ? (
            <Preview className="text-muted-foreground h-5 w-5 shrink-0" />
          ) : null}
          <Select value={selected} onValueChange={(v) => onChange(v)}>
            <SelectTrigger id={fieldId} aria-describedby={descId} className="flex-1">
              <SelectValue placeholder="Icon" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_LUCIDE_ICON_NAMES.map((name) => {
                const Icon = getLucideTemplateIcon(name);
                return (
                  <SelectItem key={name} value={name}>
                    <span className="flex items-center gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      {formatIconLabel(name)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {descNode}
      </div>
    );
  }

  if (subField.type === "boolean") {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <div className="flex items-center gap-2">
          <Switch
            id={fieldId}
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            aria-describedby={descId}
          />
        </div>
        {descNode}
      </div>
    );
  }

  const inputType = subField.type === "url" ? "url" : "text";

  return (
    <div className="space-y-1.5">
      {labelNode}
      <Input
        id={fieldId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={subField.placeholder}
        aria-describedby={descId}
      />
      {descNode}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ask the editor to expand (and scroll to + focus) one row. `nonce` must
 * change for every new request — the editor ignores a request whose nonce it
 * has already handled, so re-rendering with the same object is a no-op.
 */
export type TemplateListFocusRequest = {
  /** 0-based row index. Missing / out of range → nothing is expanded. */
  itemIndex?: number;
  nonce: number;
};

type ListField = Extract<TemplateField, { type: "list" }>;

/** Hard safety cap when a field declares no `maxItems` (matches the old editor). */
const DEFAULT_MAX_ITEMS = 50;

/** Text-entry controls, preferred focus target when a row opens. Excludes
 *  Radix's hidden bubble inputs (`aria-hidden` + `tabindex=-1`) and file pickers. */
const TEXT_FOCUS_SELECTOR = [
  'input:not([type="hidden"]):not([type="file"]):not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])',
].join(", ");

/** Any focusable control — fallback for rows with no text sub-field. */
const ANY_FOCUS_SELECTOR = [
  TEXT_FOCUS_SELECTOR,
  'button:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function cellString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function capitalize(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/** Runs `cb` after the next two animation frames (i.e. after React has
 *  committed AND the browser has laid the new DOM out). Returns a canceller. */
function afterPaint(cb: () => void): () => void {
  let second = 0;
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(cb);
  });
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
  };
}

function findRowElement(
  container: HTMLElement | null,
  rowId: string,
): HTMLElement | null {
  if (!container) return null;
  // Compared via `dataset` rather than an attribute selector so stored ids
  // never need CSS escaping.
  const rows = container.querySelectorAll<HTMLElement>("[data-row-id]");
  for (const el of rows) {
    if (el.dataset.rowId === rowId) return el;
  }
  return null;
}

function focusFirstControl(rowEl: HTMLElement) {
  const body = rowEl.querySelector<HTMLElement>("[data-row-body]");
  if (!body) return;
  const target =
    body.querySelector<HTMLElement>(TEXT_FOCUS_SELECTOR) ??
    body.querySelector<HTMLElement>(ANY_FOCUS_SELECTOR);
  target?.focus({ preventScroll: true });
}

function RowPreview({
  row,
  itemSchema,
}: {
  row: TemplateListRow;
  itemSchema: TemplateListItemField[];
}) {
  const iconField = itemSchema.find((sf) => sf.type === "icon");
  if (iconField) {
    const name =
      cellString(row[iconField.key]) || (TEMPLATE_LUCIDE_ICON_NAMES[0] ?? "");
    const Icon = getLucideTemplateIcon(name);
    return Icon ? (
      <Icon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
    ) : null;
  }
  const imageField = itemSchema.find(
    (sf) => sf.type === "image" && cellString(row[sf.key]) !== "",
  );
  if (imageField) {
    return (
      <AdminThumb
        src={cellString(row[imageField.key])}
        alt=""
        className="size-6 shrink-0 rounded object-cover"
      />
    );
  }
  return null;
}

// ─── SortableListRow ──────────────────────────────────────────────────────────

function SortableListRow({
  row,
  rowId,
  index,
  total,
  itemSchema,
  displaySchema,
  summary,
  fallbackLabel,
  open,
  onOpenChange,
  onMove,
  onDelete,
  canDelete,
  onCellChange,
  mediaLibraryEnabled,
}: {
  row: TemplateListRow;
  rowId: string;
  index: number;
  total: number;
  itemSchema: TemplateListItemField[];
  displaySchema: TemplateListItemField[];
  summary: string | null;
  fallbackLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  canDelete: boolean;
  onCellChange: (key: string, value: string) => void;
  mediaLibraryEnabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });

  const title = summary ?? fallbackLabel;

  return (
    <Collapsible
      ref={setNodeRef}
      open={open}
      onOpenChange={onOpenChange}
      data-row-id={rowId}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-muted/40 rounded-lg border",
        isDragging && "relative z-10 opacity-90 shadow-md",
      )}
    >
      <div className="flex min-h-11 items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${title}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md outline-none focus-visible:ring-[3px] active:cursor-grabbing pointer-coarse:size-11"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-row-trigger=""
            className="focus-visible:ring-ring/50 flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-[3px] pointer-coarse:min-h-11"
          >
            <RowPreview row={row} itemSchema={itemSchema} />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                summary ? "font-medium" : "text-muted-foreground",
              )}
            >
              {title}
            </span>
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "text-muted-foreground size-4 shrink-0 motion-safe:transition-transform",
                open && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-8 shrink-0 pointer-coarse:size-11"
              aria-label={`More actions for ${title}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index >= total - 1}
              onSelect={() => onMove(1)}
            >
              Move down
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-8 shrink-0 pointer-coarse:size-11"
          aria-label={`Delete ${title}`}
          disabled={!canDelete}
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <CollapsibleContent data-row-body="" className="space-y-4 border-t p-3">
        {displaySchema.map((sf) => (
          <ListItemSubFieldInput
            key={sf.key}
            subField={sf}
            value={cellString(row[sf.key])}
            onChange={(v) => onCellChange(sf.key, v)}
            mediaLibraryEnabled={mediaLibraryEnabled}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── TemplateListFieldEditor ──────────────────────────────────────────────────

export function TemplateListFieldEditor({
  field,
  value,
  onChange,
  mediaLibraryEnabled,
  focusRequest,
}: {
  field: ListField;
  value: unknown;
  onChange: (value: unknown) => void;
  mediaLibraryEnabled?: boolean;
  /** Expand + scroll to + focus a row (e.g. the visual editor jumping to a
   *  clicked list item). See `TemplateListFocusRequest`. */
  focusRequest?: TemplateListFocusRequest | null;
}) {
  const rows = useMemo(() => parseTemplateListRows(value), [value]);
  const minItems = field.minItems ?? 0;
  const maxItems = field.maxItems ?? DEFAULT_MAX_ITEMS;
  const itemLabel = field.itemLabel ?? "item";
  const ItemLabel = capitalize(itemLabel);

  // Latest rows for callbacks that outlive the render that created them
  // (toast Undo, async upload completions). `commit` also writes it so two
  // commits in the same tick compose instead of the second clobbering the first.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    rows.length === 1 && rows[0]?._id ? new Set([rows[0]._id]) : new Set(),
  );
  const [pendingFocus, setPendingFocus] = useState<{ id: string } | null>(
    null,
  );

  /** Icon sub-fields first (display order only — storage order untouched). */
  const displaySchema = useMemo(
    () => [
      ...field.itemSchema.filter((sf) => sf.type === "icon"),
      ...field.itemSchema.filter((sf) => sf.type !== "icon"),
    ],
    [field.itemSchema],
  );

  const rowIds = useMemo(() => rows.map((r) => r._id!), [rows]);
  const summaries = useMemo(
    () =>
      rows.map((r) => getListRowSummary(r, field.itemSchema, field.summaryKey)),
    [rows, field.itemSchema, field.summaryKey],
  );
  const labelFor = (id: UniqueIdentifier): string => {
    const i = rowIds.indexOf(String(id));
    if (i < 0) return itemLabel;
    return summaries[i] ?? `${ItemLabel} ${i + 1}`;
  };
  const positionOf = (id: UniqueIdentifier) => rowIds.indexOf(String(id)) + 1;

  const commit = (next: TemplateListRow[]) => {
    rowsRef.current = next;
    onChange(next);
  };

  const setRowOpen = (id: string, open: boolean) => {
    setOpenIds((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // ─── Focus handling ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!pendingFocus) return;
    return afterPaint(() => {
      const rowEl = findRowElement(containerRef.current, pendingFocus.id);
      if (!rowEl) return;
      rowEl.scrollIntoView?.({ block: "nearest" });
      focusFirstControl(rowEl);
    });
  }, [pendingFocus]);

  const handledNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!focusRequest) return;
    if (handledNonceRef.current === focusRequest.nonce) return;
    handledNonceRef.current = focusRequest.nonce;
    const { itemIndex } = focusRequest;
    const current = rowsRef.current;
    if (
      itemIndex == null ||
      !Number.isInteger(itemIndex) ||
      itemIndex < 0 ||
      itemIndex >= current.length
    ) {
      return;
    }
    const id = current[itemIndex]!._id!;
    setRowOpen(id, true);
    setPendingFocus({ id });
  }, [focusRequest]);

  /** After a delete, keep keyboard focus in the list: the row now at the
   *  deleted position, else the previous row, else the Add button. */
  const focusAfterDelete = (index: number) => {
    afterPaint(() => {
      const container = containerRef.current;
      if (!container) return;
      const triggers =
        container.querySelectorAll<HTMLElement>("[data-row-trigger]");
      const target =
        triggers[Math.min(index, triggers.length - 1)] ??
        container.querySelector<HTMLElement>("[data-list-add]");
      target?.focus();
    });
  };

  // ─── Mutations ───────────────────────────────────────────────────────────

  const addRow = () => {
    const current = rowsRef.current;
    if (current.length >= maxItems) return;
    const item: TemplateListRow = { _id: crypto.randomUUID() };
    for (const sf of field.itemSchema) {
      item[sf.key] = sf.type === "icon" ? TEMPLATE_LUCIDE_ICON_NAMES[0] : "";
    }
    commit([...current, item]);
    setRowOpen(item._id!, true);
    setPendingFocus({ id: item._id! });
  };

  const moveRow = (id: string, delta: -1 | 1) => {
    const current = rowsRef.current;
    const from = current.findIndex((r) => r._id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return;
    commit(arrayMove(current, from, to));
  };

  const updateCell = (id: string, key: string, v: string) => {
    const current = rowsRef.current;
    const index = current.findIndex((r) => r._id === id);
    if (index < 0) return;
    const next = [...current];
    next[index] = { ...current[index]!, [key]: v };
    commit(next);
  };

  const deleteRow = (id: string) => {
    const current = rowsRef.current;
    if (current.length <= minItems) return;
    const index = current.findIndex((r) => r._id === id);
    if (index < 0) return;
    const removed = current[index]!;
    const wasOpen = openIds.has(id);

    commit(current.filter((r) => r._id !== id));
    setRowOpen(id, false);
    focusAfterDelete(index);

    toast(`${ItemLabel} deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          const latest = rowsRef.current;
          // Already back (double click, or restored some other way).
          if (latest.some((r) => r._id === id)) return;
          const next = [...latest];
          next.splice(Math.min(index, latest.length), 0, removed);
          commit(next);
          if (wasOpen) setRowOpen(id, true);
        },
      },
    });
  };

  // ─── Drag and drop ───────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const current = rowsRef.current;
    const from = current.findIndex((r) => r._id === active.id);
    const to = current.findIndex((r) => r._id === over.id);
    if (from < 0 || to < 0) return;
    commit(arrayMove(current, from, to));
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${labelFor(active.id)}, position ${positionOf(active.id)} of ${rowIds.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelFor(active.id)} moved to position ${positionOf(over.id)} of ${rowIds.length}.`
        : `${labelFor(active.id)} is not over a position.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${labelFor(active.id)} dropped at position ${positionOf(over.id)} of ${rowIds.length}.`
        : `${labelFor(active.id)} dropped.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${labelFor(active.id)} returned to position ${positionOf(active.id)}.`,
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const atMax = rows.length >= maxItems;
  const canDelete = rows.length > minItems;

  return (
    <div ref={containerRef} className="space-y-3">
      {rows.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
          <p>No {itemLabel}s yet.</p>
          {field.defaultsWhenEmpty && (
            <p className="mt-1 text-xs">
              Your site is showing the built-in {itemLabel}s. Add one to
              replace them.
            </p>
          )}
        </div>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements }}
        >
          <SortableContext
            items={rowIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rows.map((row, index) => {
                const id = rowIds[index]!;
                return (
                  <SortableListRow
                    key={id}
                    row={row}
                    rowId={id}
                    index={index}
                    total={rows.length}
                    itemSchema={field.itemSchema}
                    displaySchema={displaySchema}
                    summary={summaries[index] ?? null}
                    fallbackLabel={`${ItemLabel} ${index + 1}`}
                    open={openIds.has(id)}
                    onOpenChange={(open) => setRowOpen(id, open)}
                    onMove={(delta) => moveRow(id, delta)}
                    onDelete={() => deleteRow(id)}
                    canDelete={canDelete}
                    onCellChange={(key, v) => updateCell(id, key, v)}
                    mediaLibraryEnabled={mediaLibraryEnabled}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {atMax ? (
        <p className="text-muted-foreground text-xs">
          Maximum of {maxItems} {itemLabel}s
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-list-add=""
          onClick={addRow}
          className="pointer-coarse:h-11"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add {itemLabel}
        </Button>
      )}
    </div>
  );
}
