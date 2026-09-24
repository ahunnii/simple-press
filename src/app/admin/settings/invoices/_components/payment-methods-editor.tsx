"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  HelpCircle,
  Landmark,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import type { InvoiceSettingsFormValues } from "./invoice-settings-form";
import type {
  InvoicePaymentMethod,
  InvoicePaymentMethodType,
} from "~/lib/validators/invoice";
import {
  paymentMethodDetailSummary,
  paymentMethodDisplayName,
} from "~/lib/invoices/payment-methods";
import { INVOICE_MAX_PAYMENT_METHODS } from "~/lib/validators/invoice";
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
import { Button } from "~/components/ui/button";

import { PaymentMethodDialog } from "./payment-method-dialog";

const TYPE_ICONS: Record<InvoicePaymentMethodType, typeof Landmark> = {
  bank_transfer: Landmark,
  paypal: Wallet,
  venmo: Smartphone,
  cash_app: Smartphone,
  zelle: Banknote,
  cash_check: Banknote,
  other: HelpCircle,
};

type DialogState =
  | { mode: "add" }
  | { mode: "edit"; index: number; method: InvoicePaymentMethod }
  | null;

type Props = {
  venmoHandle: string | null;
  cashAppHandle: string | null;
};

/**
 * The payment-methods list on the invoice settings form. Add/edit go through
 * `PaymentMethodDialog`; this component only owns the list, its ordering
 * (which is display order on every invoice), and removal.
 */
export function PaymentMethodsEditor({ venmoHandle, cashAppHandle }: Props) {
  const form = useFormContext<InvoiceSettingsFormValues>();
  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "paymentMethods",
  });
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  // The field array's own values (not `fields`, whose `id` is RHF's
  // synthetic render key and shadows each method's real `id`).
  const methods = form.watch("paymentMethods");

  const handleSave = (method: InvoicePaymentMethod) => {
    if (dialogState?.mode === "edit") {
      update(dialogState.index, method);
    } else {
      append(method);
    }
    setDialogState(null);
  };

  const removingMethod =
    removeIndex !== null ? methods[removeIndex] : undefined;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Stored encrypted. Full details only appear on the secure invoice page,
        never in emails.
      </p>

      {fields.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No payment methods yet — add one so invoices can tell customers how to
          pay you.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {fields.map((field, index) => {
            const method =
              methods[index] ?? (field as unknown as InvoicePaymentMethod);
            const Icon = TYPE_ICONS[method.type];
            const name = paymentMethodDisplayName(method);
            return (
              <li key={field.id} className="flex items-center gap-3 p-3">
                <Icon
                  className="text-muted-foreground h-4 w-4 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {paymentMethodDetailSummary(method)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move down"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${name}`}
                    onClick={() =>
                      setDialogState({ mode: "edit", index, method })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${name}`}
                    onClick={() => setRemoveIndex(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= INVOICE_MAX_PAYMENT_METHODS}
          onClick={() => setDialogState({ mode: "add" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add payment method
        </Button>
        {fields.length >= INVOICE_MAX_PAYMENT_METHODS && (
          <p className="text-muted-foreground mt-2 text-xs">
            Maximum of {INVOICE_MAX_PAYMENT_METHODS} payment methods reached.
          </p>
        )}
      </div>

      <PaymentMethodDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        initial={dialogState?.mode === "edit" ? dialogState.method : undefined}
        onSave={handleSave}
        venmoHandle={venmoHandle}
        cashAppHandle={cashAppHandle}
      />

      <AlertDialog
        open={removeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingMethod
                ? `"${paymentMethodDisplayName(removingMethod)}" will no longer be offered on new invoices.`
                : "This method will no longer be offered on new invoices."}{" "}
              Invoices already sent keep their own copy of the payment
              instructions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeIndex !== null) remove(removeIndex);
                setRemoveIndex(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
