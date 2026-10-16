import type { Editor } from "@tiptap/react";
import * as React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Columns2, Columns3, Columns4 } from "lucide-react";

import type { ShouldShowProps } from "../../types";
import type { ColumnLayout } from "~/lib/tiptap/columns-node";
import { coerceColumnLayout } from "~/lib/tiptap/columns-node";
import { Separator } from "~/components/ui/separator";

import { ToolbarButton } from "../toolbar-button";

// Module-level so the reference is stable: @tiptap/react re-broadcasts a
// changed `options` prop as a "bubbleMenu" meta that every bubble-menu
// plugin on the editor applies (shouldShow included).
const BUBBLE_OPTIONS = { placement: "top-start" } as const;

interface ColumnsBubbleMenuProps {
  editor: Editor;
}

/** Narrow + wide (⅓ | ⅔). */
const NarrowWideGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);

/** Wide + narrow (⅔ | ⅓). */
const WideNarrowGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
  </svg>
);

const LAYOUT_BUTTONS: {
  layout: ColumnLayout;
  tooltip: string;
  icon: React.ReactNode;
}[] = [
  { layout: "2", tooltip: "2 columns", icon: <Columns2 className="size-4" /> },
  { layout: "3", tooltip: "3 columns", icon: <Columns3 className="size-4" /> },
  { layout: "4", tooltip: "4 columns", icon: <Columns4 className="size-4" /> },
  { layout: "1-2", tooltip: "Narrow + wide", icon: <NarrowWideGlyph /> },
  { layout: "2-1", tooltip: "Wide + narrow", icon: <WideNarrowGlyph /> },
];

export const ColumnsBubbleMenu: React.FC<ColumnsBubbleMenuProps> = ({
  editor,
}) => {
  // Narrow subscription: just the current layout, so the active button
  // follows layout changes without re-rendering on every transaction.
  const currentLayout = useEditorState({
    editor,
    selector: (ctx) =>
      ctx.editor.isActive("columns")
        ? coerceColumnLayout(
            (ctx.editor.getAttributes("columns") as { layout?: unknown })
              .layout,
          )
        : null,
  });

  const shouldShow = React.useCallback(
    ({ editor, from, to }: ShouldShowProps) => {
      // The link bubble owns a selected link; a table cell inside a row
      // gets the table menu.
      if (editor.isActive("link") && from !== to) return false;
      return (
        editor.isActive("columns") &&
        !editor.isActive("table") &&
        editor.isEditable
      );
    },
    [],
  );

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="columnsBubbleMenu"
      shouldShow={shouldShow}
      options={BUBBLE_OPTIONS}
    >
      <div className="bg-popover border-border flex items-center gap-px rounded-md border p-1 shadow-md">
        {LAYOUT_BUTTONS.map(({ layout, tooltip, icon }) => (
          <ToolbarButton
            key={layout}
            tooltip={tooltip}
            aria-label={tooltip}
            isActive={currentLayout === layout}
            onClick={() =>
              editor.chain().focus().setColumnsLayout(layout).run()
            }
            size="sm"
          >
            {icon}
          </ToolbarButton>
        ))}

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          tooltip="Remove row"
          aria-label="Remove row"
          onClick={() => editor.chain().focus().deleteColumns().run()}
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <TrashIcon className="size-4" />
          <span className="text-xs">Remove row</span>
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
};
