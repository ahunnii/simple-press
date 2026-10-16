import type { Editor } from "@tiptap/react";
import type { BubbleMenuProps } from "@tiptap/react/menus";
import * as React from "react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Trash2 } from "lucide-react";

import type { ShouldShowProps } from "../../types";
import {
  coerceSpacerSize,
  SPACER_SIZE_LABEL,
  SPACER_SIZES,
} from "~/lib/tiptap/spacer-node";
import { Separator } from "~/components/ui/separator";

import { ToolbarButton } from "../toolbar-button";
import { isSpacerBubbleTarget } from "./bubble-menu-predicates";

// Module-level so the reference is stable: @tiptap/react re-broadcasts a
// changed `options` prop as a "bubbleMenu" meta that every bubble-menu
// plugin on the editor applies (shouldShow included).
// The plugin anchors a node selection to the spacer's own element, so the
// menu sits centred above the space (below it when the admin's sticky top
// bar leaves no room).
const BUBBLE_OPTIONS: NonNullable<BubbleMenuProps["options"]> = {
  placement: "top",
  offset: 8,
  flip: {
    fallbackPlacements: ["bottom"],
    crossAxis: false,
    padding: { top: 80, bottom: 16 },
  },
  shift: { padding: 8 },
};

/** Stable: see the module-level options comment. */
const shouldShow = ({ editor }: ShouldShowProps) =>
  isSpacerBubbleTarget(editor);

interface SpacerBubbleMenuProps {
  editor: Editor;
}

export const SpacerBubbleMenu: React.FC<SpacerBubbleMenuProps> = ({
  editor,
}) => {
  // Narrow subscription: just the selected spacer's size, so the pressed
  // button follows resizes without re-rendering on every transaction.
  const currentSize = useEditorState({
    editor,
    selector: (ctx) =>
      ctx.editor.isActive("spacer")
        ? coerceSpacerSize(
            (ctx.editor.getAttributes("spacer") as { size?: unknown }).size,
          )
        : null,
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="spacerBubbleMenu"
      shouldShow={shouldShow}
      options={BUBBLE_OPTIONS}
    >
      <div className="bg-popover border-border flex items-center gap-px rounded-md border p-1 shadow-md">
        {SPACER_SIZES.map((size) => {
          const label = SPACER_SIZE_LABEL[size];
          return (
            <ToolbarButton
              key={size}
              aria-label={`${label} space`}
              isActive={currentSize === size}
              pressed={currentSize === size}
              onClick={() => editor.chain().focus().setSpacerSize(size).run()}
              size="sm"
            >
              <span className="text-xs">{label}</span>
            </ToolbarButton>
          );
        })}

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          tooltip="Remove space"
          aria-label="Remove space"
          onClick={() => editor.chain().focus().deleteSpacer().run()}
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
};
