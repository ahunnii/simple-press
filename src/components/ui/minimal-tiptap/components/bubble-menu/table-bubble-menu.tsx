import type { Editor } from "@tiptap/react";
import * as React from "react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { BubbleMenu } from "@tiptap/react/menus";

import type { ShouldShowProps } from "../../types";
import { Separator } from "~/components/ui/separator";

import { ToolbarButton } from "../toolbar-button";
import { isTableBubbleTarget } from "./bubble-menu-predicates";

// Module-level so the reference is stable: @tiptap/react re-broadcasts a
// changed `options` prop as a "bubbleMenu" meta that every bubble-menu
// plugin on the editor applies (shouldShow included).
const BUBBLE_OPTIONS = { placement: "top-start" } as const;

/** Stable; a selected image or a link in a cell gets its own menu instead. */
const shouldShow = ({ editor }: ShouldShowProps) => isTableBubbleTarget(editor);

interface TableBubbleMenuProps {
  editor: Editor;
}

export const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={shouldShow}
      options={BUBBLE_OPTIONS}
    >
      <div className="bg-popover border-border flex items-center gap-px rounded-md border p-1 shadow-md">
        <ToolbarButton
          tooltip="Add row above"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          size="sm"
        >
          <ArrowUpIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Add row below"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          size="sm"
        >
          <ArrowDownIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Delete row"
          onClick={() => editor.chain().focus().deleteRow().run()}
          size="sm"
        >
          <TrashIcon className="size-4" />
          <span className="text-xs">Row</span>
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          tooltip="Add column before"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          size="sm"
        >
          <ArrowLeftIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Add column after"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          size="sm"
        >
          <ArrowRightIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Delete column"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          size="sm"
        >
          <TrashIcon className="size-4" />
          <span className="text-xs">Col</span>
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          tooltip="Delete table"
          onClick={() => editor.chain().focus().deleteTable().run()}
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <TrashIcon className="size-4" />
          <span className="text-xs">Table</span>
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
};
