import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

import type { LinkVariant } from "~/lib/tiptap/link-extension";

/**
 * Transaction meta that asks `LinkBubbleMenu` to open straight in its edit
 * form (instead of the preview with an "Edit" button) for the link the
 * selection is in.
 */
export const OPEN_LINK_EDIT_META = "minimalTiptap/openLinkEdit";

export const DEFAULT_BUTTON_TEXT = "Shop now";
export const DEFAULT_BUTTON_HREF = "/";

/**
 * Insert a button link on its own line — a paragraph holding one link with a
 * button `variant` — select its text so typing replaces it, and open the
 * link's edit form so the owner can set the text and address right away.
 * An empty current line is replaced; otherwise the paragraph goes after the
 * caret's block (splitting it if the caret is mid-line).
 */
export function insertButtonLink(
  editor: Editor,
  {
    text = DEFAULT_BUTTON_TEXT,
    href = DEFAULT_BUTTON_HREF,
    variant = "solid",
  }: { text?: string; href?: string; variant?: LinkVariant } = {},
): boolean {
  return editor
    .chain()
    .focus()
    .insertContent({
      type: "paragraph",
      content: [
        {
          type: "text",
          text,
          marks: [{ type: "link", attrs: { href, target: null, variant } }],
        },
      ],
    })
    .command(({ tr }) => {
      // The caret lands at the end of the inserted paragraph: select its
      // text (the button label).
      const { $from } = tr.selection;
      if (!$from.parent.isTextblock || $from.parent.content.size === 0) {
        return true;
      }
      const start = $from.start();
      tr.setSelection(
        TextSelection.create(tr.doc, start, start + $from.parent.content.size),
      );
      tr.setMeta(OPEN_LINK_EDIT_META, true);
      return true;
    })
    .run();
}
