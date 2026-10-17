import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Link2Icon } from "@radix-ui/react-icons";

import type { toggleVariants } from "~/components/ui/toggle";
import type { LinkVariant } from "~/lib/tiptap/link-extension";
import { linkTargetAttr } from "~/lib/tiptap/link-target";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { ToolbarButton } from "../toolbar-button";
import { LinkEditBlock } from "./link-edit-block";

interface LinkEditPopoverProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

const LinkEditPopover = ({ editor, size, variant }: LinkEditPopoverProps) => {
  const [open, setOpen] = React.useState(false);
  // Subscribe so the button's highlight follows the caret; a bare
  // editor.isActive() in render only updates when the parent re-renders.
  const { isLink, inCodeBlock } = useEditorState({
    editor,
    selector: (ctx) => ({
      isLink: ctx.editor.isActive("link"),
      inCodeBlock: ctx.editor.isActive("codeBlock"),
    }),
  });

  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, " ");

  const onSetLink = React.useCallback(
    (
      url: string,
      text?: string,
      openInNewTab?: boolean,
      variant?: LinkVariant | null,
    ) => {
      const target = linkTargetAttr(!!openInNewTab);
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
                target,
                variant: variant ?? null,
              },
            },
          ],
        })
        .setLink({ href: url, target, variant: variant ?? null })
        .run();

      editor.commands.enter();
    },
    [editor],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          isActive={isLink}
          tooltip="Link"
          aria-label="Insert link"
          disabled={inCodeBlock}
          size={size}
          variant={variant}
        >
          <Link2Icon className="size-5" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom">
        <LinkEditBlock onSave={onSetLink} defaultText={text} />
      </PopoverContent>
    </Popover>
  );
};

export { LinkEditPopover };
