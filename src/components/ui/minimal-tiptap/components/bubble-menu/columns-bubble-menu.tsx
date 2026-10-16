import type { Editor } from "@tiptap/react";
import type { BubbleMenuProps } from "@tiptap/react/menus";
import * as React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Columns2, Columns3, Columns4 } from "lucide-react";

import type { ShouldShowProps } from "../../types";
import type { ColumnLayout } from "~/lib/tiptap/columns-node";
import { coerceColumnLayout } from "~/lib/tiptap/columns-node";
import { Separator } from "~/components/ui/separator";

import { findColumnsAbove } from "../../extensions/columns/helpers";
import { ToolbarButton } from "../toolbar-button";
import { isColumnsBubbleTarget } from "./bubble-menu-predicates";

// Module-level so the reference is stable: @tiptap/react re-broadcasts a
// changed `options` prop as a "bubbleMenu" meta that every bubble-menu
// plugin on the editor applies (shouldShow included).
//
// Anchored to the whole row (see `getReferencedVirtualElement`), so the menu
// sits OUTSIDE it and never covers the row's first line:
//  - above the row's top edge, left-aligned with it;
//  - flipped below the row when there's no room above (the admin's sticky
//    top bar is ~72px; +8 for the offset, which the plugin applies after
//    flip/shift);
//  - horizontally clamped to the editor (`shift` boundary = the editor's
//    left/right edges, the viewport's top/bottom), so "Remove row" can't
//    hang past the editor card;
//  - a row taller than the viewport (no room above or below) keeps the menu
//    pinned in view while any of it shows (crossAxis), and `hide` drops it
//    once the row has scrolled out entirely.
const BUBBLE_OPTIONS: NonNullable<BubbleMenuProps["options"]> = {
  placement: "top-start",
  offset: 8,
  flip: {
    fallbackPlacements: ["bottom-start"],
    crossAxis: false,
    padding: { top: 80, bottom: 16 },
  },
  shift: (state) => ({
    crossAxis: true,
    padding: { top: 80, bottom: 16, left: 0, right: 0 },
    boundary: editorColumnBoundary(state.elements.floating),
  }),
  hide: { padding: { top: 72 } },
};

/**
 * The editor's horizontal extent as a floating-ui boundary, unbounded
 * vertically (floating-ui intersects it with the viewport). The menu is
 * mounted inside the editor's content wrapper (the plugin appends it to the
 * ProseMirror element's parent), so that wrapper is the editor's width.
 */
function editorColumnBoundary(floating: HTMLElement) {
  const container = floating.parentElement;
  if (!container) return "clippingAncestors" as const;
  const rect = container.getBoundingClientRect();
  return {
    x: rect.left,
    y: -1e6,
    width: rect.width,
    height: 2e6,
  };
}

/** The row's DOM element holding the selection, if any. */
function rowElementForSelection(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null;
  const found = findColumnsAbove(editor.state.selection.$from);
  if (!found) return null;
  const dom = editor.view.nodeDOM(found.pos);
  return dom instanceof HTMLElement ? dom : null;
}

/** Stable: see the module-level options comment. */
const shouldShow = ({ editor }: ShouldShowProps) =>
  isColumnsBubbleTarget(editor);

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

  // Positions the menu against the whole row rather than the cursor. Keyed
  // on `editor` only (fixed for the menu's life), so it is never
  // re-broadcast to the other bubble menus; `null` (no row) falls back to
  // the plugin's selection rect.
  const getReferencedVirtualElement = React.useCallback(() => {
    const row = rowElementForSelection(editor);
    if (!row) return null;
    return {
      getBoundingClientRect: () => row.getBoundingClientRect(),
      getClientRects: () => [row.getBoundingClientRect()],
    };
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="columnsBubbleMenu"
      shouldShow={shouldShow}
      getReferencedVirtualElement={getReferencedVirtualElement}
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
