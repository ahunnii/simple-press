import type { NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { InfoCircledIcon, TrashIcon } from "@radix-ui/react-icons";
import { NodeViewWrapper } from "@tiptap/react";
import { Repeat } from "lucide-react";

import type { VideoNodeAttrs } from "~/lib/tiptap/video-node";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

/**
 * In-editor preview for an uploaded video clip. Always renders native
 * controls (even for ambient clips) so owners can scrub and check the clip;
 * the storefront (`RichTextVideo`) is what actually applies ambient playback.
 */
export const VideoViewBlock: React.FC<NodeViewProps> = ({
  editor,
  node,
  selected,
  updateAttributes,
  deleteNode,
}) => {
  const { src, title, ambient } = node.attrs as VideoNodeAttrs;
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(title ?? "");
  const titleInputId = React.useId();

  // Keep the draft in sync when the attr changes from outside (undo/redo,
  // setContent from the form).
  React.useEffect(() => {
    setTitleDraft(title ?? "");
  }, [title]);

  React.useEffect(() => {
    setError(false);
  }, [src]);

  // ProseMirror handles mousedown on selectable atoms (to node-select them),
  // which fights the native video controls. Stop it at the <video> so play,
  // scrub and volume behave normally; the strip below still selects/drags.
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const stop = (event: MouseEvent) => event.stopPropagation();
    el.addEventListener("mousedown", stop);
    return () => el.removeEventListener("mousedown", stop);
    // Re-attach whenever the <video> remounts (keyed on src, hidden on error).
  }, [src, error]);

  const commitTitle = React.useCallback(() => {
    const next = titleDraft.trim();
    if (next === (title ?? "")) return;
    updateAttributes({ title: next || null });
  }, [title, titleDraft, updateAttributes]);

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper data-drag-handle className="relative my-4 leading-none">
      <div
        className={cn(
          "group/node-video relative mx-auto max-w-full rounded-md",
          {
            "outline-primary outline-2 outline-offset-1": selected,
          },
        )}
      >
        {src && !error ? (
          <video
            ref={videoRef}
            key={src}
            src={src}
            controls
            preload="metadata"
            playsInline
            aria-label={title ?? "Video"}
            className="block h-auto max-h-[600px] w-full rounded bg-black"
            onError={() => setError(true)}
          />
        ) : (
          <div className="bg-muted flex aspect-video w-full flex-col items-center justify-center rounded">
            <InfoCircledIcon className="text-destructive size-8" />
            <p className="text-muted-foreground mt-2 text-sm">
              Failed to load video
            </p>
          </div>
        )}

        {isEditable && (
          <div
            contentEditable={false}
            className="bg-muted/60 mt-2 flex flex-wrap items-center gap-2 rounded-md p-2 text-left"
          >
            <Button
              type="button"
              size="sm"
              variant={ambient ? "default" : "outline"}
              aria-pressed={ambient}
              onClick={() => updateAttributes({ ambient: !ambient })}
            >
              <Repeat className="size-4" />
              Ambient loop
            </Button>
            {ambient && (
              <span className="text-muted-foreground bg-background rounded border px-2 py-1 text-xs">
                Muted · autoplays · loops
              </span>
            )}
            <label htmlFor={titleInputId} className="sr-only">
              Video description (used as its accessible label)
            </label>
            <Input
              id={titleInputId}
              value={titleDraft}
              placeholder="Describe this video"
              className="h-8 min-w-40 flex-1 text-sm"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTitle();
                } else if (e.key === "Escape") {
                  setTitleDraft(title ?? "");
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove video"
              className="text-muted-foreground hover:text-destructive size-8"
              onClick={deleteNode}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
