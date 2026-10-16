/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Editor } from "@tiptap/react";
import * as React from "react";
import { getMarkRange } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";

import type { ShouldShowProps } from "../../types";
import type { LinkVariant } from "~/lib/tiptap/link-extension";
import { coerceLinkVariant } from "~/lib/tiptap/link-extension";

import { LinkEditBlock } from "../link/link-edit-block";
import { LinkPopoverBlock } from "../link/link-popover-block";

interface LinkBubbleMenuProps {
  editor: Editor;
}

interface LinkAttributes {
  href: string;
  target: string;
  variant: LinkVariant | null;
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [showEdit, setShowEdit] = React.useState(false);
  const [linkAttrs, setLinkAttrs] = React.useState<LinkAttributes>({
    href: "",
    target: "",
    variant: null,
  });
  const [selectedText, setSelectedText] = React.useState("");

  const updateLinkState = React.useCallback(() => {
    const { state } = editor;
    const { from, to } = state.selection;
    const { href, target, variant } = editor.getAttributes("link");
    // Saving replaces the WHOLE link (extendMarkRange), so prefill the
    // display text from the whole link — not just the selected word, which
    // would silently drop the rest of the link's text.
    const linkRange = getMarkRange(
      state.doc.resolve(from),
      state.schema.marks.link!,
    );
    const text = linkRange
      ? state.doc.textBetween(linkRange.from, linkRange.to, " ")
      : state.doc.textBetween(from, to, " ");

    setLinkAttrs({ href, target, variant: coerceLinkVariant(variant) });
    setSelectedText(text);
  }, [editor]);

  const shouldShow = React.useCallback(
    ({ editor, from, to }: ShouldShowProps) => {
      if (from === to) {
        return false;
      }
      const { href } = editor.getAttributes("link");

      if (!editor.isActive("link") || !editor.isEditable) {
        return false;
      }

      if (href) {
        updateLinkState();
        return true;
      }
      return false;
    },
    [updateLinkState],
  );

  const handleEdit = React.useCallback(() => {
    setShowEdit(true);
  }, []);

  const onSetLink = React.useCallback(
    (
      url: string,
      text?: string,
      openInNewTab?: boolean,
      variant?: LinkVariant | null,
    ) => {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .insertContent({
          type: "text",
          text: text ?? url,
          marks: [
            {
              type: "link",
              attrs: {
                href: url,
                target: openInNewTab ? "_blank" : "",
                variant: variant ?? null,
              },
            },
          ],
        })
        .setLink({
          href: url,
          target: openInNewTab ? "_blank" : "",
          variant: variant ?? null,
        })
        .run();
      setShowEdit(false);
      updateLinkState();
    },
    [editor, updateLinkState],
  );

  const onUnsetLink = React.useCallback(() => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowEdit(false);
    updateLinkState();
  }, [editor, updateLinkState]);

  // Must be referentially stable: @tiptap/react re-broadcasts a changed
  // `options` prop as a "bubbleMenu" meta that EVERY bubble-menu plugin on
  // the editor applies, shouldShow included.
  const bubbleOptions = React.useMemo(
    () => ({
      placement: "bottom-start" as const,
      onHide: () => setShowEdit(false),
    }),
    [],
  );

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkBubbleMenu"
      shouldShow={shouldShow}
      options={bubbleOptions}
    >
      {showEdit ? (
        <LinkEditBlock
          defaultUrl={linkAttrs.href}
          defaultText={selectedText}
          defaultIsNewTab={linkAttrs.target === "_blank"}
          defaultVariant={linkAttrs.variant}
          onSave={onSetLink}
          className="bg-popover text-popover-foreground w-full min-w-80 rounded-md border p-4 shadow-md outline-hidden"
        />
      ) : (
        <LinkPopoverBlock
          onClear={onUnsetLink}
          url={linkAttrs.href}
          variant={linkAttrs.variant}
          onEdit={handleEdit}
        />
      )}
    </BubbleMenu>
  );
};
