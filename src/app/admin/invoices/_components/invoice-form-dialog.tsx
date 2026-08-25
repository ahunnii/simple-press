"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { QboInvoiceKind } from "~/lib/validators/quickbooks";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { dueDateString } from "~/lib/quickbooks/mapping";
import {
  QBO_INVOICE_KIND_LABELS,
  QBO_INVOICE_KIND_VALUES,
  QBO_MAX_DESCRIPTION_LENGTH,
  QBO_MAX_MEMO_LENGTH,
  quickBooksCreateInvoiceSchema,
} from "~/lib/validators/quickbooks";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";

/**
 * Shared invoice-creation dialog. Used by `/admin/invoices` (a plain "New
 * invoice" button, `lockKind: false`) and the quote-lead detail page (a
 * "Raise deposit invoice" / "Raise final invoice" button that already knows
 * `kind` and pre-fills the amount from `computeDepositCents` /
 * `computeFinalPrefillCents`, `lockKind: true`). Neither caller talks to
 * `quickbooks.createInvoice` directly — this is the one place that request
 * is built, so validation and error handling can't drift between the two
 * entry points.
 */
export type InvoiceFormDefaults = {
  kind: "deposit" | "final" | "custom";
  amountCents: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
  memo?: string;
  dueDate?: string;
};

export type InvoiceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: InvoiceFormDefaults;
  quoteSubmissionId?: string;
  defaultDueDays: number;
  timeZone: string;
  /** When true the Kind select is read-only (lead page passes the kind). */
  lockKind?: boolean;
  onCreated?: () => void;
};

/** Every field the schema can reject, mapped to where it renders inline. */
type FieldErrors = Partial<
  Record<
    | "kind"
    | "amountCents"
    | "customerName"
    | "customerEmail"
    | "customerPhone"
    | "dueDate"
    | "description"
    | "memo",
    string
  >
>;

/**
 * Strips everything a store owner might type or paste into the Amount field
 * that isn't part of the number itself — a leading `$`, thousands-separator
 * commas, whitespace — and collapses to at most one decimal point. This MUST
 * run before `dollarsToCents`: that helper parses with `Number.parseFloat`,
 * which stops at the first comma (`parseFloat("1,200.00")` === `1`), so an
 * un-normalized "$1,200.00" would silently become a $1.00 invoice.
 */
function normalizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

/** Builds the form's initial field state from `defaults` + the store's due-date default. */
function buildInitialState(
  defaults: InvoiceFormDefaults,
  defaultDueDays: number,
  timeZone: string,
) {
  return {
    kind: defaults.kind,
    amountDollars: centsToDollarsString(defaults.amountCents),
    customerName: defaults.customerName,
    customerEmail: defaults.customerEmail,
    customerPhone: defaults.customerPhone,
    description: defaults.description ?? "",
    memo: defaults.memo ?? "",
    dueDate:
      defaults.dueDate ?? dueDateString(new Date(), defaultDueDays, timeZone),
    // Always defaults to checked regardless of `defaults` — `send` isn't part
    // of `InvoiceFormDefaults` (it's a per-submission choice, not a
    // prefillable fact about the invoice), and "email it now" is the
    // sensible default every time the dialog opens.
    send: true,
  };
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  defaults,
  quoteSubmissionId,
  defaultDueDays,
  timeZone,
  lockKind = false,
  onCreated,
}: InvoiceFormDialogProps) {
  const router = useRouter();

  const [form, setForm] = useState(() =>
    buildInitialState(defaults, defaultDueDays, timeZone),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Catches issues on fields the form doesn't render inputs for
  // (`quoteSubmissionId`, `send`) plus the mutation's own server error.
  const [formError, setFormError] = useState<string | null>(null);

  // Re-seed whenever the dialog transitions closed → open, so reopening with
  // new `defaults` (a different lead, a different kind) never shows stale
  // values from the last time it was open. Adjusting state during render is
  // the pattern this codebase already uses for exactly this kind of
  // "re-seed from props on a specific transition" case (see `AdminFilters`'s
  // search-box re-seed).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(buildInitialState(defaults, defaultDueDays, timeZone));
      setFieldErrors({});
      setFormError(null);
    }
  }

  const createMutation = api.quickbooks.createInvoice.useMutation({
    onMutate: loadingToast("Creating invoice…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        variables.send ? "Invoice sent" : "Invoice created in QuickBooks",
      );
      onOpenChange(false);
      onCreated?.();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      const message =
        error.message || "Couldn't create that invoice — please try again.";
      setFormError(message);
      toast.error(message);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (createMutation.isPending) return;
    onOpenChange(next);
  };

  // Two separate small helpers rather than one generic `update(key, value)`:
  // the form-state key and the `FieldErrors` key aren't always the same
  // string (the amount FIELD is `amountDollars`, the amount ERROR is
  // `amountCents`, matching the schema's field name), so a single generic
  // keyed off `typeof form` can't soundly reach into `FieldErrors` too.
  const setField = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const clearError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) =>
      prev[key] ? { ...prev, [key]: undefined } : prev,
    );
    if (formError) setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Checked before the zod `safeParse` below on purpose: `dollarsToCents`
    // parses an empty/garbage string as `NaN` and then returns `0`, which
    // would sail past normalization and hit the schema's `min(1)` bound —
    // surfacing a numeric "must be greater than or equal to 1" message
    // instead of telling the owner their amount wasn't a valid number.
    const normalizedAmount = normalizeAmountInput(form.amountDollars);
    const parsedAmount =
      normalizedAmount === "" ? NaN : Number.parseFloat(normalizedAmount);

    if (!Number.isFinite(parsedAmount)) {
      setFieldErrors({ amountCents: "Enter a valid amount" });
      setFormError(null);
      return;
    }

    const parsed = quickBooksCreateInvoiceSchema.safeParse({
      quoteSubmissionId,
      kind: form.kind,
      amountCents: dollarsToCents(normalizedAmount),
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone.trim() || undefined,
      dueDate: form.dueDate,
      description: form.description.trim() || undefined,
      memo: form.memo.trim() || undefined,
      send: form.send,
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};
      let nextFormError: string | null = null;

      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === "kind" ||
          key === "amountCents" ||
          key === "customerName" ||
          key === "customerEmail" ||
          key === "customerPhone" ||
          key === "dueDate" ||
          key === "description" ||
          key === "memo"
        ) {
          nextFieldErrors[key] ??= issue.message;
        } else {
          nextFormError ??= issue.message;
        }
      }

      setFieldErrors(nextFieldErrors);
      setFormError(nextFormError);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    createMutation.mutate(parsed.data);
  };

  const isPending = createMutation.isPending;
  const submitLabel = form.send ? "Send invoice" : "Create invoice";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
            <DialogDescription>
              Create and send an invoice through QuickBooks Online.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label id="invoice-kind-label" htmlFor="invoice-kind">
                  Kind
                </Label>
                <Select
                  value={form.kind}
                  onValueChange={(value) => {
                    setField({ kind: value as QboInvoiceKind });
                    clearError("kind");
                  }}
                  disabled={lockKind || isPending}
                >
                  <SelectTrigger
                    id="invoice-kind"
                    aria-labelledby="invoice-kind-label invoice-kind"
                    aria-invalid={!!fieldErrors.kind}
                    className="w-full"
                  >
                    <SelectValue placeholder="Kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {QBO_INVOICE_KIND_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {QBO_INVOICE_KIND_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.kind && (
                  <p role="alert" className="text-destructive text-sm">
                    {fieldErrors.kind}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-amount">Amount</Label>
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                    $
                  </span>
                  <Input
                    id="invoice-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-6"
                    value={form.amountDollars}
                    onChange={(e) => {
                      setField({ amountDollars: e.target.value });
                      clearError("amountCents");
                    }}
                    onBlur={() => {
                      const normalized = normalizeAmountInput(
                        form.amountDollars,
                      );
                      const parsedValue =
                        normalized === "" ? NaN : Number.parseFloat(normalized);
                      setField({
                        amountDollars: Number.isFinite(parsedValue)
                          ? centsToDollarsString(dollarsToCents(normalized))
                          : normalized,
                      });
                    }}
                    disabled={isPending}
                    aria-invalid={!!fieldErrors.amountCents}
                    aria-describedby={
                      fieldErrors.amountCents
                        ? "invoice-amount-error"
                        : undefined
                    }
                  />
                </div>
                {fieldErrors.amountCents && (
                  <p
                    id="invoice-amount-error"
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {fieldErrors.amountCents}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-customer-name">Customer name</Label>
              <Input
                id="invoice-customer-name"
                value={form.customerName}
                onChange={(e) => {
                  setField({ customerName: e.target.value });
                  clearError("customerName");
                }}
                disabled={isPending}
                aria-invalid={!!fieldErrors.customerName}
                aria-describedby={
                  fieldErrors.customerName
                    ? "invoice-customer-name-error"
                    : undefined
                }
              />
              {fieldErrors.customerName && (
                <p
                  id="invoice-customer-name-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {fieldErrors.customerName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-customer-email">Customer email</Label>
                <Input
                  id="invoice-customer-email"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => {
                    setField({ customerEmail: e.target.value });
                    clearError("customerEmail");
                  }}
                  disabled={isPending}
                  aria-invalid={!!fieldErrors.customerEmail}
                  aria-describedby={
                    fieldErrors.customerEmail
                      ? "invoice-customer-email-error"
                      : undefined
                  }
                />
                {fieldErrors.customerEmail && (
                  <p
                    id="invoice-customer-email-error"
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {fieldErrors.customerEmail}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-customer-phone">
                  Phone{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="invoice-customer-phone"
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => {
                    setField({ customerPhone: e.target.value });
                    clearError("customerPhone");
                  }}
                  disabled={isPending}
                  aria-invalid={!!fieldErrors.customerPhone}
                  aria-describedby={
                    fieldErrors.customerPhone
                      ? "invoice-customer-phone-error"
                      : undefined
                  }
                />
                {fieldErrors.customerPhone && (
                  <p
                    id="invoice-customer-phone-error"
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {fieldErrors.customerPhone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-due-date">Due date</Label>
              <Input
                id="invoice-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => {
                  setField({ dueDate: e.target.value });
                  clearError("dueDate");
                }}
                disabled={isPending}
                aria-invalid={!!fieldErrors.dueDate}
                aria-describedby={
                  fieldErrors.dueDate ? "invoice-due-date-error" : undefined
                }
              />
              {fieldErrors.dueDate && (
                <p
                  id="invoice-due-date-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {fieldErrors.dueDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="invoice-description"
                placeholder="Deposit — Handy Relocations"
                maxLength={QBO_MAX_DESCRIPTION_LENGTH}
                value={form.description}
                onChange={(e) => {
                  setField({ description: e.target.value });
                  clearError("description");
                }}
                disabled={isPending}
                aria-invalid={!!fieldErrors.description}
                aria-describedby={
                  fieldErrors.description
                    ? "invoice-description-error"
                    : undefined
                }
              />
              {fieldErrors.description && (
                <p
                  id="invoice-description-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-memo">
                Memo to customer{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="invoice-memo"
                maxLength={QBO_MAX_MEMO_LENGTH}
                value={form.memo}
                onChange={(e) => {
                  setField({ memo: e.target.value });
                  clearError("memo");
                }}
                disabled={isPending}
                aria-invalid={!!fieldErrors.memo}
                aria-describedby={
                  fieldErrors.memo ? "invoice-memo-error" : undefined
                }
              />
              {fieldErrors.memo && (
                <p
                  id="invoice-memo-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {fieldErrors.memo}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="invoice-send"
                checked={form.send}
                onCheckedChange={(checked) =>
                  setField({ send: checked === true })
                }
                disabled={isPending}
              />
              <Label htmlFor="invoice-send" className="font-normal">
                Email the invoice from QuickBooks now
              </Label>
            </div>

            {formError && (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
