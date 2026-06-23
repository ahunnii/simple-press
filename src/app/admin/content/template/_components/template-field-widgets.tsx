/* eslint-disable @next/next/no-img-element */
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
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useUploadFile } from "@better-upload/client";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type {
  TemplateField,
  TemplateFieldGroup,
  TemplateListItemField,
  TemplateListRow,
} from "~/lib/template-fields";
import {
  DEFAULT_EMBED_HEIGHT,
  isVideoEmbed,
  parseEmbedInput,
} from "~/lib/embed";
import {
  getLucideTemplateIcon,
  TEMPLATE_LUCIDE_ICON_NAMES,
} from "~/lib/lucide-template-icons";
import {
  parseTemplateIframeValue,
  parseTemplateListRows,
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { EmbedFrame } from "~/components/embed-frame";

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

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|ogg|avi|m4v|3gp|mkv)$/i.test(file.name)
  );
}

// ─── FieldGroup ───────────────────────────────────────────────────────────────

export function FieldGroup({
  groupId,
  page,
  groupMeta,
  fields,
  customFields,
  modifiedFields,
  onFieldChange,
  isUngrouped,
  embedsEnabled,
}: {
  groupId: string;
  page: string;
  groupMeta?: TemplateFieldGroup;
  fields: TemplateField[];
  customFields: Record<string, unknown>;
  modifiedFields?: Set<string>;
  onFieldChange: (key: string, value: unknown) => void;
  isUngrouped: boolean;
  embedsEnabled?: boolean;
}) {
  const columns = groupMeta?.columns ?? 1;

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
          {fields.map((field) => (
            <div key={field.key} className={field.gridColumn ?? "col-span-1"}>
              <FieldInput
                field={field}
                value={customFields[field.key]}
                isModified={modifiedFields?.has(field.key) ?? false}
                onChange={(value) => onFieldChange(field.key, value)}
                embedsEnabled={embedsEnabled}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── FieldInput ───────────────────────────────────────────────────────────────

export function FieldInput({
  field,
  value,
  isModified,
  onChange,
  embedsEnabled,
}: {
  field: TemplateField;
  value: unknown;
  isModified: boolean;
  onChange: (value: unknown) => void;
  embedsEnabled?: boolean;
}) {
  const stringValue = typeof value === "string" ? value : "";
  const richTextValue = isRichTextValue(value) ? value : EMPTY_TIPTAP_DOC;

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

      {field.type === "list" ? (
        <TemplateListFieldEditor
          field={field}
          value={value}
          onChange={onChange}
        />
      ) : field.type === "image" ? (
        <TemplateImageUploadField
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
          description={field.description}
        />
      ) : field.type === "video" ? (
        <TemplateVideoUploadField
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
          description={field.description}
        />
      ) : field.type === "gallery" ? (
        <GalleryFieldSelect
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ) : field.type === "collection" ? (
        <CollectionFieldSelect
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
          placeholder={field.placeholder ?? field.description}
          className="w-full"
          editorContentClassName="min-h-[220px] p-4"
          editorClassName="focus:outline-hidden"
          editable
          embedsEnabled={embedsEnabled}
        />
      ) : field.type === "textarea" ? (
        <Textarea
          id={field.key}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.description}
          rows={3}
        />
      ) : field.type === "boolean" ? (
        <Switch
          checked={stringValue === "true"}
          defaultChecked={field.defaultValue === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        />
      ) : (
        <Input
          id={field.key}
          type={
            field.type === "url"
              ? "url"
              : field.type === "color"
                ? "color"
                : field.type === "number"
                  ? "number"
                  : "text"
          }
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.description}
        />
      )}

      {field.type !== "image" &&
        field.type !== "video" &&
        field.type !== "iframe" && (
          <p className="text-muted-foreground text-xs">{field.description}</p>
        )}
    </div>
  );
}

// ─── ListItemSubFieldInput ────────────────────────────────────────────────────

export function ListItemSubFieldInput({
  subField,
  value,
  onChange,
}: {
  subField: TemplateListItemField;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseId = useId();
  const labelId = `${baseId}-${subField.key}`;

  if (subField.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={labelId} className="text-muted-foreground text-xs">
          {subField.label}
        </Label>
        <Textarea
          id={labelId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={subField.placeholder ?? subField.description}
          rows={3}
        />
      </div>
    );
  }

  if (subField.type === "image") {
    return (
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">
          {subField.label}
        </Label>
        <TemplateImageUploadField
          value={value}
          onChange={onChange}
          description={subField.description}
        />
      </div>
    );
  }

  if (subField.type === "video") {
    return (
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">
          {subField.label}
        </Label>
        <TemplateVideoUploadField
          value={value}
          onChange={onChange}
          description={subField.description}
        />
      </div>
    );
  }

  if (subField.type === "icon") {
    const selected = value || TEMPLATE_LUCIDE_ICON_NAMES[0];
    const Preview = getLucideTemplateIcon(selected ?? "");
    return (
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">
          {subField.label}
        </Label>
        <div className="flex items-center gap-2">
          {Preview ? (
            <Preview className="text-muted-foreground h-5 w-5 shrink-0" />
          ) : null}
          <Select value={selected} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Icon" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_LUCIDE_ICON_NAMES.map((name) => {
                const Icon = getLucideTemplateIcon(name);
                return (
                  <SelectItem key={name} value={name}>
                    <span className="flex items-center gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      {name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  const inputType = subField.type === "url" ? "url" : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={labelId} className="text-muted-foreground text-xs">
        {subField.label}
      </Label>
      <Input
        id={labelId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={subField.placeholder ?? subField.description}
      />
    </div>
  );
}

// ─── TemplateListFieldEditor ──────────────────────────────────────────────────

export function TemplateListFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Extract<TemplateField, { type: "list" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const rows = parseTemplateListRows(value);
  const minItems = field.minItems ?? 0;
  const maxItems = field.maxItems ?? 50;

  const setRows = (next: TemplateListRow[]) => onChange(next);

  const addRow = () => {
    if (rows.length >= maxItems) return;
    const item: TemplateListRow = { _id: crypto.randomUUID() };
    for (const sf of field.itemSchema) {
      item[sf.key] = sf.type === "icon" ? TEMPLATE_LUCIDE_ICON_NAMES[0] : "";
    }
    setRows([...rows, item]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= minItems) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    const a = next[index]!;
    const b = next[j]!;
    next[index] = b;
    next[j] = a;
    setRows(next);
  };

  const updateCell = (rowIndex: number, key: string, v: string) => {
    const next = [...rows];
    const row = { ...next[rowIndex]! };
    row[key] = v;
    next[rowIndex] = row;
    setRows(next);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No items yet. Add one below.
        </p>
      )}
      {rows.map((row, rowIndex) => (
        <div
          key={String(row._id ?? rowIndex)}
          className="border-border bg-muted/50 rounded-lg border p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-foreground text-sm font-medium">
              Item {rowIndex + 1}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move up"
                disabled={rowIndex === 0}
                onClick={() => moveRow(rowIndex, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move down"
                disabled={rowIndex >= rows.length - 1}
                onClick={() => moveRow(rowIndex, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700"
                aria-label="Remove item"
                disabled={rows.length <= minItems}
                onClick={() => removeRow(rowIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field.itemSchema.map((sf) => {
              const raw = row[sf.key];
              const cell =
                typeof raw === "string" ? raw : raw == null ? "" : "";
              return (
                <ListItemSubFieldInput
                  key={sf.key}
                  subField={sf}
                  value={cell}
                  onChange={(v) => updateCell(rowIndex, sf.key, v)}
                />
              );
            })}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= maxItems}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add item
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

  const currentParsed = parseEmbedInput(pasteText);
  const currentSrc = currentParsed?.src ?? null;
  const isVideo = currentSrc ? isVideoEmbed(currentSrc) : false;

  const emitChange = useCallback(
    (src: string, height: number, title: string) => {
      if (!src || !title) return;
      onChange(JSON.stringify({ src, height, title }));
    },
    [onChange],
  );

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
      emitChange(result.src, result.height ?? heightState, titleState);
    }
  };

  const handleHeightChange = (h: number) => {
    setHeightState(h);
    if (currentSrc && titleState) {
      emitChange(currentSrc, h, titleState);
    }
  };

  const handleTitleChange = (t: string) => {
    setTitleState(t);
    if (currentSrc && t) {
      emitChange(currentSrc, heightState, t);
    } else if (!t) {
      onChange("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-sm">URL or embed code</Label>
        <Textarea
          value={pasteText}
          onChange={(e) => handlePasteTextChange(e.target.value)}
          placeholder="https://... or <iframe ...>"
          rows={3}
          disabled={disabled}
          className={cn(
            parseError ? "border-red-400 focus-visible:ring-red-400" : "",
          )}
        />
        {parseError && <p className="text-xs text-red-600">{parseError}</p>}
      </div>

      {!isVideo && (
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
      {isVideo && (
        <p className="text-muted-foreground text-xs">
          Video embeds display at 16:9 aspect ratio.
        </p>
      )}

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

      {currentSrc && titleState && (
        <div className="border-border overflow-hidden rounded-md border">
          <EmbedFrame
            src={currentSrc}
            height={isVideo ? undefined : heightState}
            title={titleState}
          />
        </div>
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
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: galleries } = api.gallery.list.useQuery();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
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
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: collections } = api.collections.getAll.useQuery();

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? "" : v)}
    >
      <SelectTrigger>
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

// ─── TemplateImageUploadField ─────────────────────────────────────────────────

type TemplateImageUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
};

export function TemplateImageUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
}: TemplateImageUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed");
      setLocalFile(null);
    },
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isImageFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isImageFile(file)) {
        toast.error("Please select a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setLocalFile(file);
      try {
        const response = await uploader.upload(file);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          onChange(fileLocation);
          toast.success("Image uploaded successfully");
          setLocalFile(null);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled ?? isUploading}
          aria-label={label ?? "Choose image file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <img
              src={previewUrl}
              alt={hasFile ? localFile.name : "Preview"}
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isUploading
                  ? "Uploading..."
                  : hasFile
                    ? "Uploading..."
                    : "Current image"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isUploading}
              aria-label="Remove image"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? isUploading}
          onClick={triggerFileInput}
          className="w-full"
        >
          {isUploading ? (
            <>
              <span
                className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                aria-hidden="true"
              />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace image" : "Choose image"}
            </>
          )}
        </Button>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isImageFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isUploading) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          Drag and drop an image here, or click to browse
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}

// ─── TemplateVideoUploadField ─────────────────────────────────────────────────

type TemplateVideoUploadFieldProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
};

export function TemplateVideoUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
}: TemplateVideoUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploader = useUploadFile({
    api: "/api/upload",
    route: "video",
    onError: (error) => {
      toast.error(error.message ?? "Video upload failed");
      setLocalFile(null);
    },
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isVideoFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isVideoFile(file)) {
        toast.error("Please select a valid video file");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video must be less than 50MB");
        return;
      }
      setLocalFile(file);
      try {
        const response = await uploader.upload(file);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          onChange(fileLocation);
          toast.success("Video uploaded successfully");
          setLocalFile(null);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload video");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          disabled={disabled ?? isUploading}
          aria-label={label ?? "Choose video file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <video
              src={previewUrl}
              controls
              muted
              className="h-16 w-24 shrink-0 rounded-md bg-black object-cover"
            >
              Your browser does not support the video tag.
            </video>
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isUploading
                  ? "Uploading..."
                  : hasFile
                    ? "Uploading..."
                    : "Current video"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isUploading}
              aria-label="Remove video"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? isUploading}
          onClick={triggerFileInput}
          className="w-full"
        >
          {isUploading ? (
            <>
              <span
                className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                aria-hidden="true"
              />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace video" : "Choose video"}
            </>
          )}
        </Button>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isVideoFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isUploading) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          Drag and drop a video here, or click to browse (max 50MB)
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}
