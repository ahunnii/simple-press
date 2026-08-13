"use client";

import type { ReactNode } from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Drives the submit button's copy only — "Save Changes"/"Saving..." when
   * true, `submitLabel`/"Adding..." when false. Title and description are
   * resolved by the caller because their edit-mode copy is entity-specific
   * (the Reviews dialog interpolates the product name).
   */
  isEditing: boolean;
  title: ReactNode;
  description: ReactNode;
  /** Create-mode submit label, e.g. "Add Review". Edit mode is always "Save Changes". */
  submitLabel: string;
  isPending: boolean;
  onSubmit: SubmitHandler<CurrentForm>;
  children: ReactNode;
};

/**
 * Shared shell for the admin "add / edit one record" form dialogs.
 *
 * Owns everything those dialogs had byte-for-byte in common: the dialog
 * sizing + scroll container, the header, the `space-y-5 py-4` field body, and
 * the Cancel/submit footer with its pending spinner. Callers supply only
 * their own fields as `children`.
 *
 * Sizing is deliberate. `ui/dialog.tsx` ships no max-height and no overflow of
 * its own, and `DialogContent` is `fixed top-1/2 -translate-y-1/2` — content
 * taller than the viewport bleeds off *both* ends and the header becomes
 * unreachable. Hence `max-h-[90vh] overflow-y-auto` here, matching every other
 * long dialog in the admin.
 *
 * The body is a plain vertical stack, not a grid: fields that want to sit
 * two-across wrap themselves in `grid sm:grid-cols-2` and pass
 * `className="col-span-1"` to each child, because the shared `*FormField`
 * primitives hardcode `col-span-full` on their `FormItem`.
 */
export function EntityFormDialog<CurrentForm extends FieldValues>({
  form,
  isOpen,
  onClose,
  isEditing,
  title,
  description,
  submitLabel,
  isPending,
  onSubmit,
  children,
}: Props<CurrentForm>) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">{children}</div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Saving..." : "Adding..."}
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  submitLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
