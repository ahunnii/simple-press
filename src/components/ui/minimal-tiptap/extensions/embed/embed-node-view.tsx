"use client";

import type { NodeViewProps } from "@tiptap/core";
import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Frame, X } from "lucide-react";

import type { EmbedOptions } from "./index";
import type {
  EmbedAspectRatio,
  EmbedDisplayMode,
  EmbedWidth,
} from "~/lib/embed";
import {
  coerceEmbedAspectRatio,
  coerceEmbedDisplayMode,
  coerceEmbedWidth,
  DEFAULT_EMBED_HEIGHT,
  EMBED_ASPECT_RATIOS,
  EMBED_WIDTH_PRESETS,
  isVideoEmbed,
  parseEmbedInput,
} from "~/lib/embed";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { EmbedFrame } from "~/components/embed-frame";

export function EmbedNodeView({
  node,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) {
  const opts = extension.options as EmbedOptions;
  const embedsEnabled = opts.embedsEnabled !== false;

  const hasSrc = !!node.attrs.src;
  const [isEditing, setIsEditing] = useState(!hasSrc);

  const [pasteValue, setPasteValue] = useState<string>(
    typeof node.attrs.src === "string" ? node.attrs.src : "",
  );
  const [heightInput, setHeightInput] = useState<number>(
    typeof node.attrs.height === "number"
      ? node.attrs.height
      : DEFAULT_EMBED_HEIGHT,
  );
  const [titleInput, setTitleInput] = useState<string>(
    typeof node.attrs.title === "string" ? node.attrs.title : "",
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Live preview parsing
  const parsed = parseEmbedInput(pasteValue);
  const isVideo = parsed ? isVideoEmbed(parsed.src) : false;

  // Derive the initial aspect ratio from stored attr, or default based on video detection
  const storedAspectRatio = coerceEmbedAspectRatio(node.attrs.aspectRatio);
  const defaultAspectRatio: EmbedAspectRatio = isVideo ? "16:9" : "fit";
  const [aspectRatio, setAspectRatio] = useState<EmbedAspectRatio>(
    storedAspectRatio ?? defaultAspectRatio,
  );

  const storedMaxWidth = coerceEmbedWidth(node.attrs.maxWidth);
  const [maxWidth, setMaxWidth] = useState<EmbedWidth>(
    storedMaxWidth ?? "full",
  );

  const storedDisplayMode = coerceEmbedDisplayMode(node.attrs.displayMode);
  const [displayMode, setDisplayMode] = useState<EmbedDisplayMode>(
    storedDisplayMode ?? "inline",
  );

  const [triggerLabel, setTriggerLabel] = useState<string>(
    typeof node.attrs.triggerLabel === "string"
      ? node.attrs.triggerLabel
      : "Open",
  );

  // When the URL input changes, auto-default aspect ratio for video if user hasn't set one yet
  const handlePasteChange = (value: string) => {
    setPasteValue(value);
    setUrlError(null);
    const p = parseEmbedInput(value);
    if (p && !storedAspectRatio) {
      // Only auto-adjust when no stored value is present (first parse)
      const newIsVideo = isVideoEmbed(p.src);
      if (newIsVideo && aspectRatio === "fit") {
        setAspectRatio("16:9");
      } else if (!newIsVideo && aspectRatio === "16:9" && !storedAspectRatio) {
        setAspectRatio("fit");
      }
    }
  };

  const handleSave = () => {
    setUrlError(null);
    setTitleError(null);

    const result = parseEmbedInput(pasteValue);
    if (!result) {
      setUrlError("Enter a valid https:// URL or embed code.");
      return;
    }
    if (!titleInput.trim()) {
      setTitleError("Title is required for accessibility.");
      return;
    }

    updateAttributes({
      src: result.src,
      title: titleInput.trim(),
      aspectRatio,
      height:
        aspectRatio === "fit" ? (result.height ?? heightInput) : undefined,
      maxWidth,
      displayMode,
      triggerLabel:
        displayMode === "dialog" ? triggerLabel.trim() || "Open" : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!hasSrc) {
      deleteNode();
    } else {
      setIsEditing(false);
    }
  };

  const handleRemove = () => {
    if (confirm("Remove this embed?")) {
      deleteNode();
    }
  };

  // Disabled state — preserve node in document but show a notice
  if (!embedsEnabled) {
    return (
      <NodeViewWrapper className="embed-node my-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
          Embeds are currently disabled for this business. Re-enable the embed
          feature to display this content.
        </div>
      </NodeViewWrapper>
    );
  }

  // Editing / insertion state
  if (isEditing || !node.attrs.src) {
    return (
      <NodeViewWrapper className="embed-node my-4 max-w-full">
        <div className="max-w-full overflow-hidden rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Frame className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h3 className="mb-1 font-medium text-gray-900">Insert Embed</h3>
                <p className="text-sm text-gray-600">
                  Paste a URL or embed code (e.g. a booking widget, map, or
                  video)
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="embed-paste" className="text-sm font-medium">
                  URL or embed code
                </Label>
                <Textarea
                  id="embed-paste"
                  placeholder="https://example.com or <iframe ...>"
                  value={pasteValue}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  rows={3}
                  className="field-sizing-normal w-full max-w-full font-mono text-sm break-all"
                />
                {urlError && <p className="text-sm text-red-600">{urlError}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="embed-title" className="text-sm font-medium">
                  Title{" "}
                  <span className="font-normal text-gray-500">
                    (accessibility label, e.g. &ldquo;Booking calendar&rdquo;)
                  </span>
                </Label>
                <Input
                  id="embed-title"
                  placeholder="Booking calendar"
                  value={titleInput}
                  onChange={(e) => {
                    setTitleInput(e.target.value);
                    setTitleError(null);
                  }}
                />
                {titleError && (
                  <p className="text-sm text-red-600">{titleError}</p>
                )}
              </div>

              {/* Sizing controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="embed-aspect-ratio"
                    className="text-sm font-medium"
                  >
                    Aspect ratio
                  </Label>
                  <Select
                    value={aspectRatio}
                    onValueChange={(v) => setAspectRatio(v as EmbedAspectRatio)}
                  >
                    <SelectTrigger id="embed-aspect-ratio" className="w-full">
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

                <div className="space-y-1">
                  <Label
                    htmlFor="embed-max-width"
                    className="text-sm font-medium"
                  >
                    Width
                  </Label>
                  <Select
                    value={maxWidth}
                    onValueChange={(v) => setMaxWidth(v as EmbedWidth)}
                  >
                    <SelectTrigger id="embed-max-width" className="w-full">
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

              {/* Height — only shown when aspect ratio is "fit" */}
              {aspectRatio === "fit" && (
                <div className="space-y-1">
                  <Label htmlFor="embed-height" className="text-sm font-medium">
                    Height (px)
                  </Label>
                  <Input
                    id="embed-height"
                    type="number"
                    min={100}
                    max={2000}
                    value={heightInput}
                    onChange={(e) => setHeightInput(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              )}

              {/* Display mode */}
              <div className="space-y-1">
                <Label
                  htmlFor="embed-display-mode"
                  className="text-sm font-medium"
                >
                  Display mode
                </Label>
                <Select
                  value={displayMode}
                  onValueChange={(v) => setDisplayMode(v as EmbedDisplayMode)}
                >
                  <SelectTrigger
                    id="embed-display-mode"
                    className="w-full max-w-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="dialog">
                      Dialog (opens in a modal)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger label — only shown when display mode is "dialog" */}
              {displayMode === "dialog" && (
                <div className="space-y-1">
                  <Label
                    htmlFor="embed-trigger-label"
                    className="text-sm font-medium"
                  >
                    Button label
                  </Label>
                  <Input
                    id="embed-trigger-label"
                    placeholder="Open"
                    value={triggerLabel}
                    onChange={(e) => setTriggerLabel(e.target.value)}
                    className="w-48"
                  />
                </div>
              )}

              {/* Live preview — always inline even if displayMode is dialog */}
              {parsed && titleInput.trim() && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
                    Preview
                  </p>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <EmbedFrame
                      src={parsed.src}
                      height={
                        aspectRatio === "fit"
                          ? (parsed.height ?? heightInput)
                          : undefined
                      }
                      title={titleInput.trim()}
                      aspectRatio={aspectRatio}
                      maxWidth={maxWidth}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Display state — read saved attrs
  const savedAspectRatio = coerceEmbedAspectRatio(node.attrs.aspectRatio);
  const savedMaxWidth = coerceEmbedWidth(node.attrs.maxWidth);
  const savedHeight =
    typeof node.attrs.height === "number" ? node.attrs.height : undefined;

  return (
    <NodeViewWrapper className="embed-node my-6 max-w-full">
      <div className="group relative max-w-full overflow-hidden">
        {/* Edit Overlay */}
        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex gap-2 rounded-lg bg-white p-1 shadow-lg">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Embed Display */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <EmbedFrame
            src={String(node.attrs.src)}
            height={savedHeight}
            title={typeof node.attrs.title === "string" ? node.attrs.title : ""}
            aspectRatio={savedAspectRatio}
            maxWidth={savedMaxWidth}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
