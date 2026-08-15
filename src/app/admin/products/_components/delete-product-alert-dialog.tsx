"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

/** Just what the copy needs to name the row and state the consequences. */
export type DeleteProductTarget = {
  name: string;
  slug: string;
  published: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The row being deleted, or null. Kept as a prop rather than an early
   * `return null` on a missing id: unmounting the dialog is how you lose the
   * close animation and, with it, the focus restore Radix performs on exit.
   */
  product: DeleteProductTarget | null;
  onConfirm: () => void;
  isPending?: boolean;
};

export const DeleteProductAlertDialog = ({
  open,
  onOpenChange,
  product,
  onConfirm,
  isPending,
}: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* Name in the TITLE, consequences in the description — the shape
              Collections and Inventory use. The title is the line people
              actually read before clicking through, and "Delete product" told
              them nothing they hadn't already decided. */}
          <AlertDialogTitle>
            {product ? `Delete “${product.name}”?` : "Delete Product?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Its images will be deleted too.
            {product?.published
              ? ` Its storefront page at /shop/${product.slug} will stop working.`
              : ""}{" "}
            {/* OrderItem.productId is `onDelete: SetNull` and the item name,
                price and options are snapshotted at checkout — so order history
                survives intact, which is the thing an owner is most afraid of
                breaking here. */}
            Past orders keep their own record of what was bought. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          {/* `variant`, NOT className. AlertDialogAction wraps a `Button ...
              asChild`, so a className lands on the inner Radix element while
              Button still supplies `bg-primary` — and Slot concatenates the two
              without tailwind-merge, so CSS order decides and primary wins. The
              `className="bg-destructive …"` this file used to carry rendered
              BLACK. */}
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
