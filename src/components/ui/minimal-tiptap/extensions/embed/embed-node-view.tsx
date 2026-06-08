"use client";

import type { NodeViewProps } from "@tiptap/core";
import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Frame, X } from "lucide-react";

import type { EmbedOptions } from "./index";
import {
  DEFAULT_EMBED_HEIGHT,
  isVideoEmbed,
  parseEmbedInput,
} from "~/lib/embed";
import { EmbedFrame } from "~/components/embed-frame";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

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
      height: result.height ?? heightInput,
      title: titleInput.trim(),
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
      <NodeViewWrapper className="embed-node my-4">
        <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Frame className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h3 className="mb-1 font-medium text-gray-900">
                  Insert Embed
                </h3>
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
                  onChange={(e) => {
                    setPasteValue(e.target.value);
                    setUrlError(null);
                  }}
                  rows={3}
                  className="font-mono text-sm"
                />
                {urlError && (
                  <p className="text-sm text-red-600">{urlError}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="embed-title" className="text-sm font-medium">
                  Title{" "}
                  <span className="text-gray-500 font-normal">
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

              {!isVideo && (
                <div className="space-y-1">
                  <Label
                    htmlFor="embed-height"
                    className="text-sm font-medium"
                  >
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

              {isVideo && (
                <p className="text-xs text-gray-500 italic">
                  Video embeds display at 16:9 — height setting is not
                  applicable.
                </p>
              )}

              {/* Live preview */}
              {parsed && titleInput.trim() && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Preview
                  </p>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <EmbedFrame
                      src={parsed.src}
                      height={isVideo ? undefined : (parsed.height ?? heightInput)}
                      title={titleInput.trim()}
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

  // Display state
  return (
    <NodeViewWrapper className="embed-node my-6">
      <div className="group relative">
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
            height={
              typeof node.attrs.height === "number"
                ? node.attrs.height
                : undefined
            }
            title={
              typeof node.attrs.title === "string" ? node.attrs.title : ""
            }
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
