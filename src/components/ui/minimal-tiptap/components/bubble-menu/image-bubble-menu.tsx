import type { Editor } from "@tiptap/react";
import * as React from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type { ShouldShowProps } from "../../types";
import type { ImageSource } from "../image/image-edit-dialog";
import type { ImageAlign, ImageSize } from "~/lib/tiptap/image-node";
import {
  coerceImageAlign,
  coerceImageSize,
  IMAGE_SIZE_LABEL,
  IMAGE_SIZE_PERCENT,
  IMAGE_SIZES,
} from "~/lib/tiptap/image-node";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";

import { randomId } from "../../utils";
import { ImageInsertDialog } from "../image/image-edit-dialog";
import { ToolbarButton } from "../toolbar-button";

// Module-level so the reference is stable: @tiptap/react re-broadcasts a
// changed `options` prop as a "bubbleMenu" meta that every bubble-menu
// plugin on the editor applies (shouldShow included).
// Images are often taller than the viewport: crossAxis shift keeps the menu
// pinned in view (clear of the admin's sticky save bar) while any part of
// the image is visible, instead of riding off-screen with the image's top.
const BUBBLE_OPTIONS = {
  placement: "top",
  shift: { crossAxis: true, padding: { top: 72, bottom: 16 } },
} as const;

const SIZE_SHORT: Record<ImageSize, string> = {
  small: "S",
  medium: "M",
  large: "L",
  full: "Full",
};

const ALIGN_BUTTONS: {
  align: ImageAlign;
  tooltip: string;
  icon: React.ReactNode;
}[] = [
  {
    align: "left",
    tooltip: "Align left",
    icon: <AlignLeft className="size-4" />,
  },
  {
    align: "center",
    tooltip: "Align center",
    icon: <AlignCenter className="size-4" />,
  },
  {
    align: "right",
    tooltip: "Align right",
    icon: <AlignRight className="size-4" />,
  },
];

function selectedImage(editor: Editor) {
  const { selection } = editor.state;
  return selection instanceof NodeSelection &&
    selection.node.type.name === "image"
    ? { node: selection.node, pos: selection.from }
    : null;
}

/** Stable: shows only for a node-selected image in an editable editor. */
const shouldShow = ({ editor, state }: ShouldShowProps) =>
  editor.isEditable &&
  state.selection instanceof NodeSelection &&
  state.selection.node.type.name === "image";

interface ImageBubbleMenuProps {
  editor: Editor;
}

/**
 * Floating controls for a selected image: size preset (S/M/L/Full of its
 * column), alignment, alt text, Replace and Remove. Choosing a size clears
 * any legacy pixel width, so the image adapts to columns and phones.
 */
export const ImageBubbleMenu: React.FC<ImageBubbleMenuProps> = ({ editor }) => {
  const current = useEditorState({
    editor,
    selector: (ctx) => {
      const hit = selectedImage(ctx.editor);
      if (!hit) return null;
      const alt = hit.node.attrs.alt as unknown;
      return {
        pos: hit.pos,
        size: coerceImageSize(hit.node.attrs.size),
        align: coerceImageAlign(hit.node.attrs.align),
        alt: typeof alt === "string" ? alt : "",
      };
    },
  });

  const [editingAlt, setEditingAlt] = React.useState(false);
  const [altDraft, setAltDraft] = React.useState("");
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  // The image being replaced: the dialog steals focus (and the selection's
  // visibility), so remember where it was when Replace was clicked.
  const replacePosRef = React.useRef<number | null>(null);
  const altId = React.useId();

  const bubbleOptions = React.useMemo(
    () => ({ ...BUBBLE_OPTIONS, onHide: () => setEditingAlt(false) }),
    [],
  );

  const setLayout = React.useCallback(
    (attrs: { size?: ImageSize; align?: ImageAlign }) => {
      const next: Record<string, unknown> = { ...attrs };
      if (attrs.size) {
        next.width = null;
        next.height = null;
        // The editor shows an unaligned image centred; pin that, so the
        // storefront doesn't fall back to the template's own alignment.
        if (!attrs.align && !current?.align) next.align = "center";
      }
      editor.chain().focus().updateAttributes("image", next).run();
    },
    [current?.align, editor],
  );

  const startAltEdit = React.useCallback(() => {
    setAltDraft(current?.alt ?? "");
    setEditingAlt(true);
  }, [current?.alt]);

  const saveAlt = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const value = altDraft.trim();
      editor
        .chain()
        .focus()
        .updateAttributes("image", { alt: value === "" ? null : value })
        .run();
      setEditingAlt(false);
    },
    [altDraft, editor],
  );

  const openReplace = React.useCallback(() => {
    replacePosRef.current = selectedImage(editor)?.pos ?? null;
    setReplaceOpen(true);
  }, [editor]);

  const handleReplace = React.useCallback(
    (source: ImageSource) => {
      const pos = replacePosRef.current;
      if (pos === null) return;
      const isFile = source instanceof File;
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          const node = tr.doc.nodeAt(pos);
          if (node?.type.name !== "image") return false;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            // A local file previews as a blob and uploads in the node view.
            src: isFile ? URL.createObjectURL(source) : source,
            fileName: isFile ? source.name : null,
            id: randomId(),
            title: null,
            width: null,
            height: null,
          });
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          return true;
        })
        .run();
    },
    [editor],
  );

  const remove = React.useCallback(() => {
    editor.chain().focus().deleteSelection().run();
  }, [editor]);

  return (
    <>
      <BubbleMenu
        editor={editor}
        pluginKey="imageBubbleMenu"
        shouldShow={shouldShow}
        options={bubbleOptions}
      >
        {editingAlt ? (
          <form
            onSubmit={saveAlt}
            className="bg-popover text-popover-foreground w-80 space-y-2 rounded-md border p-3 shadow-md"
          >
            <Label htmlFor={altId}>Describe this image</Label>
            <Input
              id={altId}
              autoFocus
              value={altDraft}
              placeholder="e.g. Two hands shaping clay on a wheel"
              onChange={(e) => setAltDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditingAlt(false);
                  editor.commands.focus();
                }
              }}
            />
            <p className="text-muted-foreground text-xs">
              Read aloud by screen readers and shown if the image can&apos;t
              load. Leave empty for purely decorative images.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAlt(false);
                  editor.commands.focus();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        ) : (
          <div
            role="toolbar"
            aria-label="Image options"
            className="bg-popover border-border flex items-center gap-px rounded-md border p-1 shadow-md"
          >
            {IMAGE_SIZES.map((size) => (
              <ToolbarButton
                key={size}
                tooltip={`${IMAGE_SIZE_LABEL[size]} (${IMAGE_SIZE_PERCENT[size]}%)`}
                aria-label={`${IMAGE_SIZE_LABEL[size]}, ${IMAGE_SIZE_PERCENT[size]}% wide`}
                pressed={current?.size === size}
                onClick={() => setLayout({ size })}
                size="sm"
                className="min-w-8 px-2 text-xs font-medium"
              >
                {SIZE_SHORT[size]}
              </ToolbarButton>
            ))}

            <Separator orientation="vertical" className="mx-1 h-5" />

            {ALIGN_BUTTONS.map(({ align, tooltip, icon }) => (
              <ToolbarButton
                key={align}
                tooltip={tooltip}
                aria-label={tooltip}
                pressed={current?.align === align}
                onClick={() => setLayout({ align })}
                size="sm"
              >
                {icon}
              </ToolbarButton>
            ))}

            <Separator orientation="vertical" className="mx-1 h-5" />

            <ToolbarButton
              tooltip={
                current?.alt ? `Alt text: ${current.alt}` : "Add alt text"
              }
              aria-label="Edit alt text"
              onClick={startAltEdit}
              size="sm"
              className="px-2 text-xs font-medium"
            >
              Alt
              {!current?.alt && (
                <span
                  aria-hidden="true"
                  className="bg-destructive size-1.5 rounded-full"
                />
              )}
            </ToolbarButton>
            <ToolbarButton
              tooltip="Replace image"
              aria-label="Replace image"
              onClick={openReplace}
              size="sm"
            >
              <RefreshCw className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              tooltip="Remove image"
              aria-label="Remove image"
              onClick={remove}
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </ToolbarButton>
          </div>
        )}
      </BubbleMenu>

      <ImageInsertDialog
        editor={editor}
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        onReplace={handleReplace}
      />
    </>
  );
};
