/**
 * Shared field-widget components extracted from template-fields-editor.tsx.
 *
 * These components are business/preview-agnostic: they render a single
 * TemplateField given a value + onChange callback and do NOT depend on
 * business, siteContent, or any preview pipeline state.
 *
 * Import from both template-fields-editor.tsx (site-wide fields) and
 * service-template-fields-editor.tsx (per-service fields).
 */
"use client";

import type { Content } from "@tiptap/react";
import { useId, useRef, useCallback, useEffect, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
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
import { GripVertical, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type {
  EmbedAspectRatio,
  EmbedDisplayMode,
  EmbedWidth,
} from "~/lib/embed";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import {
  DEFAULT_EMBED_HEIGHT,
  EMBED_ASPECT_RATIOS,
  EMBED_WIDTH_PRESETS,
  isVideoEmbed,
  parseEmbedInput,
} from "~/lib/embed";
import {
  buildFieldsByKey,
  isFieldVisible,
  parseTemplateIframeValue,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MinimalTiptapEditor } from "~/components/ui/minimal-tiptap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { uploadRichTextImage } from "~/components/inputs/minimal-tiptap-form-field";
import { EmbedFrame } from "~/components/embed-frame";

import type { TemplateListFocusRequest } from "./template-list-field-editor";
import { TemplateListFieldEditor } from "./template-list-field-editor";
import {
  TemplateImageUploadField,
  TemplateVideoUploadField,
} from "./template-media-upload-fields";

// Re-exported so existing imports from this module keep resolving after the
// list editor + upload widgets moved to their own files.
export {
  ListItemSubFieldInput,
  TemplateListFieldEditor,
} from "./template-list-field-editor";
export type { TemplateListFocusRequest } from "./template-list-field-editor";
export {
  TemplateImageUploadField,
  TemplateVideoUploadField,
} from "./template-media-upload-fields";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_TIPTAP_DOC: Content = { type: "doc", content: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isRichTextValue(value: unknown): value is Content {
  return (
    isRecord(value) &&
    value.type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

// ─── FieldGroup ───────────────────────────────────────────────────────────────

export function FieldGroup({
  groupId,
  page,
  groupMeta,
  fields,
  allFields,
  customFields,
  modifiedFields,
  onFieldChange,
  isUngrouped,
  embedsEnabled,
  mediaLibraryEnabled,
}: {
  groupId: string;
  page: string;
  groupMeta?: TemplateFieldGroup;
  fields: TemplateField[];
  /**
   * Full field list to resolve `visibleWhen` controlling fields against —
   * a controlling field may live in a different group than the field it
   * gates. Defaults to `fields` when omitted (fine when every field on the
   * page is passed in already).
   */
  allFields?: TemplateField[];
  customFields: Record<string, unknown>;
  modifiedFields?: Set<string>;
  onFieldChange: (key: string, value: unknown) => void;
  isUngrouped: boolean;
  embedsEnabled?: boolean;
  mediaLibraryEnabled?: boolean;
}) {
  const columns = groupMeta?.columns ?? 1;
  const fieldsByKey = buildFieldsByKey(allFields ?? fields);
  const visibleFields = fields.filter((field) =>
    isFieldVisible(field, customFields, fieldsByKey),
  );

  return (
    <Card id={`fieldgroup-${page}-${groupId}`} tabIndex={-1}>
      <CardHeader>
        {!isUngrouped && groupMeta && (
          <div className="flex items-center gap-2">
            {groupMeta.icon && (
              <span className="text-xl">{groupMeta.icon}</span>
            )}
            <div>
              <CardTitle className="text-base">{groupMeta.title}</CardTitle>
              {groupMeta.description && (
                <CardDescription className="mt-1">
                  {groupMeta.description}
                </CardDescription>
              )}
            </div>
          </div>
        )}
        {isUngrouped && (
          <CardTitle className="text-base">Other Fields</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`grid gap-6 ${
            columns === 1
              ? "grid-cols-1"
              : columns === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {visibleFields.map((field) => (
            <div key={field.key} className={field.gridColumn ?? "col-span-1"}>
              <FieldInput
                field={field}
                value={customFields[field.key]}
                isModified={modifiedFields?.has(field.key) ?? false}
                onChange={(value) => onFieldChange(field.key, value)}
                embedsEnabled={embedsEnabled}
                mediaLibraryEnabled={mediaLibraryEnabled}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── FieldInput ───────────────────────────────────────────────────────────────

/** Field types whose blank-string ("unsaved") value should render as the
 *  template's own `defaultValue` instead of a bare empty widget. An
 *  explicitly saved `""` still displays empty — see `FieldInput` below. */
function showsDefaultWhenUnset(fieldType: TemplateField["type"]): boolean {
  return (
    fieldType === "text" ||
    fieldType === "textarea" ||
    fieldType === "url" ||
    fieldType === "number"
  );
}

export function FieldInput({
  field,
  value,
  isModified,
  onChange,
  embedsEnabled,
  mediaLibraryEnabled,
  listFocusRequest,
}: {
  field: TemplateField;
  value: unknown;
  isModified: boolean;
  onChange: (value: unknown) => void;
  embedsEnabled?: boolean;
  mediaLibraryEnabled?: boolean;
  /** `list` fields only: expand + focus a row. Ignored for other types. */
  listFocusRequest?: TemplateListFocusRequest | null;
}) {
  // `value === undefined` means the key was never saved — distinct from an
  // explicitly saved "" (which owners use to hide optional text/colors).
  const isUnset = value === undefined;
  const stringValue = typeof value === "string" ? value : "";
  const richTextValue = isRichTextValue(value) ? value : EMPTY_TIPTAP_DOC;

  const displayValue =
    isUnset && showsDefaultWhenUnset(field.type)
      ? (field.defaultValue ?? "")
      : stringValue;
  const colorDisplayValue = isUnset ? (field.defaultValue ?? "") : stringValue;

  const descId = field.description ? `${field.key}-desc` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key} className="flex items-center gap-2">
        {field.label}
        {isModified && (
          <Badge variant="outline" className="text-xs">
            Modified
          </Badge>
        )}
      </Label>

      {field.description && (
        <p id={descId} className="text-muted-foreground text-xs">
          {field.description}
        </p>
      )}

      {field.type === "list" ? (
        <TemplateListFieldEditor
          field={field}
          value={value}
          onChange={onChange}
          mediaLibraryEnabled={mediaLibraryEnabled}
          focusRequest={listFocusRequest}
        />
      ) : field.type === "faq" ? (
        <FaqFieldEditor field={field} value={value} onChange={onChange} />
      ) : field.type === "image" ? (
        <TemplateImageUploadField
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
          mediaLibraryEnabled={mediaLibraryEnabled}
        />
      ) : field.type === "video" ? (
        <TemplateVideoUploadField
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
          mediaLibraryEnabled={mediaLibraryEnabled}
        />
      ) : field.type === "gallery" ? (
        <GalleryFieldSelect
          id={field.key}
          descId={descId}
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ) : field.type === "collection" ? (
        <CollectionFieldSelect
          id={field.key}
          descId={descId}
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ) : field.type === "iframe" ? (
        embedsEnabled ? (
          <IframeFieldEditor
            value={stringValue}
            onChange={(nextValue) => onChange(nextValue)}
          />
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Embeds are disabled for this business. Enable the Embeds feature in{" "}
            <strong>Settings → Features</strong>.
          </div>
        )
      ) : field.type === "richtext" ? (
        <MinimalTiptapEditor
          value={richTextValue}
          onChange={(nextValue) => onChange(nextValue)}
          output="json"
          placeholder={field.placeholder}
          className="w-full"
          editorContentClassName="min-h-[220px] p-4 text-base md:text-sm"
          editorClassName="focus:outline-hidden"
          editable
          embedsEnabled={embedsEnabled}
          uploader={uploadRichTextImage}
        />
      ) : field.type === "textarea" ? (
        <Textarea
          id={field.key}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-describedby={descId}
          rows={3}
        />
      ) : field.type === "boolean" ? (
        <Switch
          id={field.key}
          checked={isUnset ? field.defaultValue === "true" : stringValue === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          aria-describedby={descId}
        />
      ) : field.type === "color" ? (
        <div className="flex items-center gap-2">
          {/* Native color inputs have no empty state (an unset value renders
              as black), so an unsaved field shows the template's default
              swatch, and an explicitly-cleared field ("" saved) is echoed
              as text — "None" — with no Clear button. Clear writes "" back,
              which templates treat as "no color". */}
          <Input
            id={field.key}
            type="color"
            value={colorDisplayValue || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby={descId}
            className="w-16 shrink-0 cursor-pointer"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {colorDisplayValue ? colorDisplayValue.toUpperCase() : "None"}
          </span>
          {colorDisplayValue ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground ml-auto h-7 px-2 text-xs"
              onClick={() => onChange("")}
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </Button>
          ) : null}
        </div>
      ) : field.type === "number" ? (
        field.control === "slider" ? (
          <NumberSliderWidget
            id={field.key}
            descId={descId}
            displayValue={displayValue}
            defaultValue={field.defaultValue}
            min={field.min}
            max={field.max}
            step={field.step}
            unit={field.unit}
            onChange={onChange}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={displayValue}
              onChange={(e) => onChange(e.target.value)}
              aria-describedby={descId}
            />
            {field.unit && (
              <span className="text-muted-foreground shrink-0 text-xs">
                {field.unit}
              </span>
            )}
          </div>
        )
      ) : (
        <Input
          id={field.key}
          type={field.type === "url" ? "url" : "text"}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-describedby={descId}
        />
      )}
    </div>
  );
}

/**
 * Slider control for a `number` field with `control: "slider"`. Drags update
 * only a local draft position — `onChange` (which drives a debounced draft
 * save + preview reload upstream) fires once, on commit, not per tick.
 *
 * A `""` display value (unsaved, no default, or explicitly reset) can't be
 * rendered as a slider position, so the thumb falls back to `defaultValue`
 * (or `min`) purely for that purpose — the saved value itself is untouched.
 */
function NumberSliderWidget({
  id,
  descId,
  displayValue,
  defaultValue,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  id: string;
  descId?: string;
  displayValue: string;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: string) => void;
}) {
  const sliderMin = min ?? 0;
  const sliderMax = max ?? 100;
  const sliderStep = step ?? 1;

  const resolveNumeric = useCallback(
    (raw: string): number => {
      const n = raw !== "" ? Number(raw) : Number(defaultValue ?? sliderMin);
      if (!Number.isFinite(n)) return sliderMin;
      return Math.min(sliderMax, Math.max(sliderMin, n));
    },
    [defaultValue, sliderMin, sliderMax],
  );

  const [draft, setDraft] = useState<number>(() => resolveNumeric(displayValue));

  useEffect(() => {
    setDraft(resolveNumeric(displayValue));
  }, [displayValue, resolveNumeric]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          aria-describedby={descId}
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={[draft]}
          onValueChange={([v]) => {
            if (v !== undefined) setDraft(v);
          }}
          onValueCommit={([v]) => {
            if (v !== undefined) onChange(String(v));
          }}
          className="flex-1"
        />
        <span className="text-muted-foreground w-14 shrink-0 text-right text-xs tabular-nums">
          {draft}
          {unit ?? ""}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 px-2 text-xs"
        onClick={() => onChange("")}
      >
        Reset
      </Button>
    </div>
  );
}

// ─── IframeFieldEditor ────────────────────────────────────────────────────────

export function IframeFieldEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const parsed = parseTemplateIframeValue(value);

  const [pasteText, setPasteText] = useState<string>(parsed?.src ?? value);
  const [heightState, setHeightState] = useState<number>(
    parsed?.height ?? DEFAULT_EMBED_HEIGHT,
  );
  const [titleState, setTitleState] = useState<string>(parsed?.title ?? "");
  const [parseError, setParseError] = useState<string | null>(null);
  const [aspectRatioState, setAspectRatioState] = useState<EmbedAspectRatio>(
    parsed?.aspectRatio ?? "16:9",
  );
  const [maxWidthState, setMaxWidthState] = useState<EmbedWidth>(
    parsed?.maxWidth ?? "full",
  );
  const [displayModeState, setDisplayModeState] = useState<EmbedDisplayMode>(
    parsed?.displayMode ?? "inline",
  );
  const [triggerLabelState, setTriggerLabelState] = useState<string>(
    parsed?.triggerLabel ?? "Open",
  );

  const currentParsed = parseEmbedInput(pasteText);
  const currentSrc = currentParsed?.src ?? null;

  // When a new src is pasted and no aspect ratio was previously saved, default
  // video URLs to 16:9 and everything else to "fit".
  const handlePasteTextChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParseError(null);
      onChange("");
      return;
    }
    const result = parseEmbedInput(text);
    if (!result) {
      setParseError("Enter a valid https:// URL or embed code");
      onChange("");
    } else {
      setParseError(null);
      // Auto-pick a sensible default when no ratio is saved yet.
      if (!parsed?.aspectRatio) {
        const auto: EmbedAspectRatio = isVideoEmbed(result.src)
          ? "16:9"
          : "fit";
        setAspectRatioState(auto);
        emitChange(
          result.src,
          heightState,
          titleState,
          auto,
          maxWidthState,
          displayModeState,
          triggerLabelState,
        );
      } else {
        emitChange(
          result.src,
          result.height ?? heightState,
          titleState,
          aspectRatioState,
          maxWidthState,
          displayModeState,
          triggerLabelState,
        );
      }
    }
  };

  const emitChange = useCallback(
    (
      src: string,
      height: number,
      title: string,
      aspectRatio: EmbedAspectRatio,
      maxWidth: EmbedWidth,
      displayMode: EmbedDisplayMode,
      triggerLabel: string,
    ) => {
      if (!src || !title) return;
      const payload: Record<string, unknown> = {
        src,
        title,
        aspectRatio,
        maxWidth,
        displayMode,
      };
      if (aspectRatio === "fit") payload.height = height;
      if (displayMode === "dialog") payload.triggerLabel = triggerLabel;
      onChange(JSON.stringify(payload));
    },
    [onChange],
  );

  const handleHeightChange = (h: number) => {
    setHeightState(h);
    if (currentSrc && titleState) {
      emitChange(
        currentSrc,
        h,
        titleState,
        aspectRatioState,
        maxWidthState,
        displayModeState,
        triggerLabelState,
      );
    }
  };

  const handleTitleChange = (t: string) => {
    setTitleState(t);
    if (currentSrc && t) {
      emitChange(
        currentSrc,
        heightState,
        t,
        aspectRatioState,
        maxWidthState,
        displayModeState,
        triggerLabelState,
      );
    } else if (!t) {
      onChange("");
    }
  };

  const handleAspectRatioChange = (v: string) => {
    const ar = v as EmbedAspectRatio;
    setAspectRatioState(ar);
    if (currentSrc && titleState) {
      emitChange(
        currentSrc,
        heightState,
        titleState,
        ar,
        maxWidthState,
        displayModeState,
        triggerLabelState,
      );
    }
  };

  const handleMaxWidthChange = (v: string) => {
    const mw = v as EmbedWidth;
    setMaxWidthState(mw);
    if (currentSrc && titleState) {
      emitChange(
        currentSrc,
        heightState,
        titleState,
        aspectRatioState,
        mw,
        displayModeState,
        triggerLabelState,
      );
    }
  };

  const handleDisplayModeChange = (v: string) => {
    const dm = v as EmbedDisplayMode;
    setDisplayModeState(dm);
    if (currentSrc && titleState) {
      emitChange(
        currentSrc,
        heightState,
        titleState,
        aspectRatioState,
        maxWidthState,
        dm,
        triggerLabelState,
      );
    }
  };

  const handleTriggerLabelChange = (t: string) => {
    setTriggerLabelState(t);
    if (currentSrc && titleState) {
      emitChange(
        currentSrc,
        heightState,
        titleState,
        aspectRatioState,
        maxWidthState,
        displayModeState,
        t,
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* ── URL / embed code ── */}
      <div className="space-y-1.5">
        <Label className="text-sm">URL or embed code</Label>
        <Textarea
          value={pasteText}
          onChange={(e) => handlePasteTextChange(e.target.value)}
          placeholder="https://... or <iframe ...>"
          rows={3}
          disabled={disabled}
          className={cn(
            "field-sizing-normal w-full max-w-full break-all",
            parseError ? "border-red-400 focus-visible:ring-red-400" : "",
          )}
        />
        {parseError && <p className="text-xs text-red-600">{parseError}</p>}
      </div>

      {/* ── Sizing controls ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Aspect ratio</Label>
          <Select
            value={aspectRatioState}
            onValueChange={handleAspectRatioChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMBED_ASPECT_RATIOS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Width</Label>
          <Select
            value={maxWidthState}
            onValueChange={handleMaxWidthChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMBED_WIDTH_PRESETS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Height — only when aspect ratio is "fit" ── */}
      {aspectRatioState === "fit" && (
        <div className="space-y-1.5">
          <Label className="text-sm">Height (px)</Label>
          <Input
            type="number"
            min={100}
            max={2000}
            value={heightState}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) handleHeightChange(n);
            }}
            disabled={disabled}
          />
        </div>
      )}

      {/* ── Display mode ── */}
      <div className="space-y-1.5">
        <Label className="text-sm">Display</Label>
        <Select
          value={displayModeState}
          onValueChange={handleDisplayModeChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inline">Inline</SelectItem>
            <SelectItem value="dialog">Open in dialog</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Trigger label — only when display mode is "dialog" ── */}
      {displayModeState === "dialog" && (
        <div className="space-y-1.5">
          <Label className="text-sm">Button label</Label>
          <Input
            type="text"
            value={triggerLabelState}
            onChange={(e) => handleTriggerLabelChange(e.target.value)}
            placeholder="Open"
            disabled={disabled}
          />
        </div>
      )}

      {/* ── Accessibility title ── */}
      <div className="space-y-1.5">
        <Label className="text-sm">Title</Label>
        <Input
          type="text"
          value={titleState}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Booking widget, Video title, etc."
          disabled={disabled}
        />
        <p className="text-muted-foreground text-xs">
          Describes the embed for screen readers.
        </p>
      </div>

      {/* ── Live preview ── */}
      {currentSrc && titleState && displayModeState === "inline" && (
        <div className="border-border overflow-hidden rounded-md border">
          <EmbedFrame
            src={currentSrc}
            height={aspectRatioState === "fit" ? heightState : undefined}
            title={titleState}
            aspectRatio={aspectRatioState}
            maxWidth={maxWidthState}
          />
        </div>
      )}
      {currentSrc && titleState && displayModeState === "dialog" && (
        <p className="text-muted-foreground text-xs">
          Preview not shown for dialog embeds — the embed opens in a modal on
          the storefront.
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        Paste a URL (YouTube, Vimeo, booking widget, etc.) or an{" "}
        <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
          &lt;iframe&gt;
        </code>{" "}
        embed code.
      </p>
    </div>
  );
}

// ─── GalleryFieldSelect ───────────────────────────────────────────────────────

export function GalleryFieldSelect({
  id,
  descId,
  value,
  onChange,
}: {
  id?: string;
  descId?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: galleries } = api.gallery.list.useQuery();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-describedby={descId}>
        <SelectValue placeholder="Select a gallery..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {galleries?.map((gallery) => (
          <SelectItem key={gallery.id} value={gallery.id}>
            {gallery.name} ({gallery._count.images} images)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── CollectionFieldSelect ────────────────────────────────────────────────────

export function CollectionFieldSelect({
  id,
  descId,
  value,
  onChange,
}: {
  id?: string;
  descId?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: collections } = api.collections.getAll.useQuery();

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? "" : v)}
    >
      <SelectTrigger id={id} aria-describedby={descId}>
        <SelectValue placeholder="Select a collection..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None (use featured products)</SelectItem>
        {collections?.map((collection) => (
          <SelectItem key={collection.id} value={collection.id}>
            {collection.name} ({collection._count.collectionProducts} products)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const FAQ_NONE = "__none__";

type FaqOption = { id: string; question: string; published: boolean };

/**
 * Leniently reads the stored `faq` field value as a flat array of FAQ ids,
 * preserving `""` entries (an unselected row) instead of dropping them.
 *
 * `parseFaqPickerIds` (in `~/lib/template-fields`, used by the storefront
 * renderer) intentionally strips blanks — right for rendering, wrong for this
 * editor's own round trip: clearing a row back to "Select a question..."
 * must keep its (now-empty) slot in place, not delete it.
 */
function parseFaqRowIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => (typeof v === "string" ? v : ""));
}

function SortableFaqRow({
  sortId,
  index,
  total,
  id,
  options,
  onSelect,
  onMove,
  onDelete,
  canDelete,
}: {
  sortId: string;
  index: number;
  total: number;
  id: string;
  options: FaqOption[];
  onSelect: (id: string) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId });

  const position = index + 1;

  return (
    <div
      ref={setNodeRef}
      data-row-id={sortId}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "border-border bg-muted/50 flex items-center gap-2 rounded-lg border p-3",
        isDragging && "relative z-10 opacity-90 shadow-md",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder question ${position}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md outline-none focus-visible:ring-[3px] active:cursor-grabbing pointer-coarse:size-11"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <Select
        value={id || FAQ_NONE}
        onValueChange={(v) => onSelect(v === FAQ_NONE ? "" : v)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select a question..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FAQ_NONE}>Select a question...</SelectItem>
          {options.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.question}
              {item.published ? "" : " (unpublished)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex shrink-0 items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 pointer-coarse:size-11"
              aria-label={`More actions for question ${position}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={index === 0}
              onSelect={() => onMove(-1)}
            >
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
          className="h-8 w-8 text-red-600 hover:text-red-700 pointer-coarse:size-11"
          aria-label={`Delete question ${position}`}
          disabled={!canDelete}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function FaqFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Extract<TemplateField, { type: "faq" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { data: items } = api.faq.adminList.useQuery();
  const maxItems = field.maxItems ?? 10;
  const minItems = field.minItems ?? 0;
  const ids = parseFaqRowIds(value);
  const published = (items ?? []).filter((item) => item.published);
  const byId = new Map((items ?? []).map((item) => [item.id, item]));

  // Latest ids for callbacks that outlive the render that created them
  // (toast Undo). `commit` also writes it so two commits in the same tick
  // compose instead of the second clobbering the first.
  const idsRef = useRef(ids);
  idsRef.current = ids;

  // Stable identity per row, for dnd-kit and for React's `key`: the selected
  // FAQ id when set, else a generated key held here. Rows used to be keyed
  // `${id}-${rowIndex}`, which remounted every row on each move. Every
  // mutation below (add/move/delete/drag) keeps this array's length and
  // order in lockstep with `ids`; the guard is only a safety net (e.g. first
  // mount, or an unexpected external length change).
  const keysRef = useRef<string[]>([]);
  if (keysRef.current.length !== ids.length) {
    const prev = keysRef.current;
    keysRef.current = ids.map((_, i) => prev[i] ?? crypto.randomUUID());
  }
  const sortIds = ids.map((id, i) => id || keysRef.current[i]!);

  const commit = (nextIds: string[], nextKeys: string[]) => {
    idsRef.current = nextIds;
    keysRef.current = nextKeys;
    onChange(nextIds);
  };

  const addRow = () => {
    if (ids.length >= maxItems) return;
    const used = new Set(ids);
    const nextId = published.find((item) => !used.has(item.id))?.id ?? "";
    commit([...ids, nextId], [...keysRef.current, crypto.randomUUID()]);
  };

  const removeRow = (index: number) => {
    if (ids.length <= minItems) return;
    const removedId = ids[index]!;
    const removedKey = keysRef.current[index]!;

    commit(
      ids.filter((_, i) => i !== index),
      keysRef.current.filter((_, i) => i !== index),
    );

    toast("Question deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          const latestIds = idsRef.current;
          const latestKeys = keysRef.current;
          // Already back (double click, or restored some other way).
          if (latestKeys.includes(removedKey)) return;
          const at = Math.min(index, latestIds.length);
          const nextIds = [...latestIds];
          nextIds.splice(at, 0, removedId);
          const nextKeys = [...latestKeys];
          nextKeys.splice(at, 0, removedKey);
          commit(nextIds, nextKeys);
        },
      },
    });
  };

  const moveRow = (index: number, delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    const nextIds = [...ids];
    const nextKeys = [...keysRef.current];
    [nextIds[index], nextIds[j]] = [nextIds[j]!, nextIds[index]!];
    [nextKeys[index], nextKeys[j]] = [nextKeys[j]!, nextKeys[index]!];
    commit(nextIds, nextKeys);
  };

  const updateRow = (index: number, id: string) => {
    const nextIds = [...ids];
    nextIds[index] = id;
    commit(nextIds, keysRef.current);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const dndId = useId();

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = sortIds.indexOf(String(active.id));
    const to = sortIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    commit(arrayMove(ids, from, to), arrayMove(keysRef.current, from, to));
  };

  const canDelete = ids.length > minItems;

  return (
    <div className="space-y-3">
      {ids.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Showing the first {maxItems} published questions.{" "}
          <a
            href="/admin/content/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Pick specific ones, or add questions under Content → FAQ
          </a>
          .
        </p>
      )}
      {ids.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {ids.map((id, rowIndex) => {
                const usedElsewhere = new Set(
                  ids.filter((_, i) => i !== rowIndex),
                );
                const current = byId.get(id);
                const options = published.filter(
                  (item) => item.id === id || !usedElsewhere.has(item.id),
                );
                if (
                  current &&
                  !current.published &&
                  !options.some((o) => o.id === id)
                ) {
                  options.unshift(current);
                }
                return (
                  <SortableFaqRow
                    key={sortIds[rowIndex]}
                    sortId={sortIds[rowIndex]!}
                    index={rowIndex}
                    total={ids.length}
                    id={id}
                    options={options}
                    onSelect={(v) => updateRow(rowIndex, v)}
                    onMove={(delta) => moveRow(rowIndex, delta)}
                    onDelete={() => removeRow(rowIndex)}
                    canDelete={canDelete}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={ids.length >= maxItems || published.length === 0}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add question
      </Button>
    </div>
  );
}
