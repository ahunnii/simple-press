"use client";

import type { FieldTypeChangeImpact } from "./builder-shared";
import type { FormFieldType } from "~/lib/validators/form";
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

import { FIELD_TYPE_META } from "./builder-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromType: FormFieldType;
  toType: FormFieldType;
  impact: FieldTypeChangeImpact;
  onConfirm: () => void;
};

/**
 * Confirms a field's type change once `describeFieldTypeChangeImpact` found
 * something at stake. Mirrors the quote calculator builder's
 * `ChangeTypeDialog` — same "always open, format the impact object" shape.
 */
export function ChangeTypeDialog({
  open,
  onOpenChange,
  fromType,
  toType,
  impact,
  onConfirm,
}: Props) {
  const fromLabel = FIELD_TYPE_META[fromType].label;
  const toLabel = FIELD_TYPE_META[toType].label;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change to {toLabel}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p className="text-foreground font-medium">
                {fromLabel} → {toLabel}
              </p>
              {!impact.optionsDiscarded && !impact.wasConfirmationTarget ? (
                <p>Label, help text, required and placeholder carry over.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {impact.optionsDiscarded && (
                    <li>Its options will be removed.</li>
                  )}
                  {impact.wasConfirmationTarget && (
                    <li>
                      This field sends the confirmation email — that setting
                      will be cleared.
                    </li>
                  )}
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Change type</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
