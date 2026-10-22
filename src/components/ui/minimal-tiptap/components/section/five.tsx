import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { CaretDownIcon, PlusIcon } from "@radix-ui/react-icons";

import type { FormatAction } from "../../types";
import type { toggleVariants } from "~/components/ui/toggle";

import { EmailProductsInsertDialog } from "../email-products/email-products-insert-dialog";
import { EmbedInsertDialog } from "../embed/embed-insert-dialog";
import { FormInsertDialog } from "../form/form-insert-dialog";
import { GalleryInsertDialog } from "../gallery/gallery-insert-dialog";
import { ImageEditDialog } from "../image/image-edit-dialog";
import { useOpenInsertDialog } from "../insert-dialog-context";
import { getInsertItems, hasExtension } from "../insert-items";
import { LinkEditPopover } from "../link/link-edit-popover";
import { QuoteCalculatorInsertDialog } from "../quote-calculator/quote-calculator-insert-dialog";
import { ToolbarSection } from "../toolbar-section";
import { VideoInsertDialog } from "../video/video-insert-dialog";

interface SectionFiveProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  mainActionCount?: number;
  emailMode?: boolean;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
  layoutBlocksEnabled?: boolean;
  /** Email "Products" block (the `products` feature); email mode only. */
  productsEnabled?: boolean;
}

export const SectionFive: React.FC<SectionFiveProps> = ({
  editor,
  mainActionCount = 0,
  size,
  variant,
  emailMode = false,
  galleriesEnabled = false,
  embedsEnabled = false,
  quotesEnabled = false,
  formsEnabled = false,
  layoutBlocksEnabled = false,
  productsEnabled = false,
}) => {
  // The video extension is only registered when the editor was given a
  // `videoUploader`, so its presence doubles as the "videos enabled" flag.
  const videosEnabled = hasExtension(editor, "video");

  const openDialog = useOpenInsertDialog();

  // Same registry and gates as the "/" menu (see `insert-items.tsx`).
  const insertActions = React.useMemo<FormatAction[]>(
    () =>
      getInsertItems("toolbar", {
        emailMode,
        galleriesEnabled,
        embedsEnabled,
        quotesEnabled,
        formsEnabled,
        layoutBlocksEnabled,
        productsEnabled,
        videosEnabled,
      }).map((item) => ({
        value: item.value,
        label: item.label,
        icon: item.icon,
        action: (ed) => {
          const { dialog } = item;
          if (dialog) {
            // After the dropdown has closed, so the two never fight over
            // focus (and the menu's pointer-events lock is gone).
            window.setTimeout(() => openDialog?.(dialog), 0);
            return;
          }
          item.run?.(ed);
        },
        isActive: item.isActive ?? (() => false),
        canExecute: item.canExecute,
        shortcuts: item.shortcuts,
      })),
    [
      emailMode,
      galleriesEnabled,
      embedsEnabled,
      quotesEnabled,
      formsEnabled,
      layoutBlocksEnabled,
      productsEnabled,
      videosEnabled,
      openDialog,
    ],
  );

  return (
    <>
      <LinkEditPopover editor={editor} size={size} variant={variant} />
      <ImageEditDialog editor={editor} size={size} variant={variant} />
      {videosEnabled && (
        <VideoInsertDialog editor={editor} size={size} variant={variant} />
      )}
      {galleriesEnabled && (
        <GalleryInsertDialog
          editor={editor}
          size={size ?? "default"}
          variant={variant ?? "default"}
        />
      )}
      {embedsEnabled && (
        <EmbedInsertDialog
          editor={editor}
          size={size ?? "default"}
          variant={variant ?? "default"}
        />
      )}
      {quotesEnabled && (
        <QuoteCalculatorInsertDialog
          editor={editor}
          size={size ?? "default"}
          variant={variant ?? "default"}
        />
      )}
      {emailMode && productsEnabled && (
        <EmailProductsInsertDialog editor={editor} />
      )}
      {formsEnabled && (
        <FormInsertDialog
          editor={editor}
          size={size ?? "default"}
          variant={variant ?? "default"}
        />
      )}
      <ToolbarSection
        editor={editor}
        actions={insertActions}
        mainActionCount={mainActionCount}
        dropdownIcon={
          <>
            <PlusIcon className="size-5" />
            <CaretDownIcon className="size-5" />
          </>
        }
        dropdownTooltip="Insert elements"
        size={size}
        variant={variant}
      />
    </>
  );
};

SectionFive.displayName = "SectionFive";

export default SectionFive;
