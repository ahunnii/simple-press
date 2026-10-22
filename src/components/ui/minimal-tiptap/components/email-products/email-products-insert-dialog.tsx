"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";

import type { EmailProductItem } from "~/lib/tiptap/email-products-node";

import { useInsertDialogState } from "../insert-dialog-context";
import { ProductPickerDialog } from "./product-picker-dialog";

/**
 * The "Products" insert dialog (email mode). It has no toolbar button of
 * its own: the Insert dropdown and the "/" menu open it through
 * `InsertDialogContext`, and confirming inserts a product block at the caret.
 */
export function EmailProductsInsertDialog({ editor }: { editor: Editor }) {
  const [open, setOpen] = useInsertDialogState("product");

  const insert = React.useCallback(
    (items: EmailProductItem[]) =>
      editor.chain().focus().insertEmailProducts({ items }).run(),
    [editor],
  );

  return (
    <ProductPickerDialog
      open={open}
      onOpenChange={setOpen}
      onConfirm={insert}
    />
  );
}
