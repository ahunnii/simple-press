"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import type {
  DepositPreset,
  LeadBillingSummary,
} from "~/lib/quickbooks/mapping";
import type { DepositRule } from "~/lib/quickbooks/types";
import type { QboInvoiceKind } from "~/lib/validators/quickbooks";
import {
  centsToDollarsString,
  dollarsToCents,
  formatPrice,
} from "~/lib/prices";
import {
  computeDepositPresets,
  dueDateString,
  presetForRule,
} from "~/lib/quickbooks/mapping";
import { cn } from "~/lib/utils";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

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
  /** Prefills the "Billing address" section — e.g. the first address answer
   *  on a quote lead. Omitted entirely (not merely blank) when the caller has
   *  no address to offer, which is also what leaves the section collapsed by
   *  default. */
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
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
  /**
   * What a deposit is a percentage OF — the lead's quote/estimate. Optional
   * and only consulted when `defaults.kind === "deposit"`: the plain
   * `/admin/invoices` caller (no lead, `kind: "custom"`) never passes it, so
   * the deposit-preset control simply never renders there.
   */
  depositBasisCents?: number | null;
  /** The owner's saved deposit rule — decides which preset chip starts
   *  selected (`presetForRule`). Only consulted alongside `depositBasisCents`. */
  depositRule?: DepositRule;
  /** The lead's running billing totals — drives the "final" kind's
   *  quote-minus-deposits breakdown. Only consulted when `defaults.kind ===
   *  "final"`. */
  billing?: LeadBillingSummary;
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
    | "memo"
    | "billingLine1"
    | "billingLine2"
    | "billingCity"
    | "billingState"
    | "billingZip",
    string
  >
>;

/** `FieldErrors` keys the billing-address section owns — used to decide
 *  whether a validation failure should force the collapsed section open. */
const BILLING_ERROR_KEYS = [
  "billingLine1",
  "billingLine2",
  "billingCity",
  "billingState",
  "billingZip",
] as const satisfies ReadonlyArray<keyof FieldErrors>;

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
  depositRule: DepositRule | undefined,
) {
  return {
    kind: defaults.kind,
    amountDollars: centsToDollarsString(defaults.amountCents),
    // Which deposit chip started selected. `defaults.amountCents` already
    // equals the preset amount whenever the rule IS a preset (see
    // `computeDepositPresets`'s doc comment), so this never contradicts the
    // seeded `amountDollars` above — it just labels which chip that amount
    // corresponds to.
    depositPreset: depositRule
      ? presetForRule(depositRule)
      : ("custom" satisfies DepositPreset),
    customerName: defaults.customerName,
    customerEmail: defaults.customerEmail,
    customerPhone: defaults.customerPhone,
    description: defaults.description ?? "",
    memo: defaults.memo ?? "",
    dueDate:
      defaults.dueDate ?? dueDateString(new Date(), defaultDueDays, timeZone),
    billingLine1: defaults.billingAddress?.line1 ?? "",
    billingLine2: defaults.billingAddress?.line2 ?? "",
    billingCity: defaults.billingAddress?.city ?? "",
    billingState: defaults.billingAddress?.state ?? "",
    billingZip: defaults.billingAddress?.zip ?? "",
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
  depositBasisCents,
  depositRule,
  billing,
  onCreated,
}: InvoiceFormDialogProps) {
  const router = useRouter();

  const [form, setForm] = useState(() =>
    buildInitialState(defaults, defaultDueDays, timeZone, depositRule),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Catches issues on fields the form doesn't render inputs for
  // (`quoteSubmissionId`, `send`) plus the mutation's own server error.
  const [formError, setFormError] = useState<string | null>(null);
  // Starts open only when the caller actually has an address to show —
  // otherwise the section stays out of the way for the common no-address
  // case (custom invoices, leads captured before an `address` question
  // existed).
  const [billingExpanded, setBillingExpanded] = useState(
    Boolean(defaults.billingAddress?.line1),
  );

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
      setForm(
        buildInitialState(defaults, defaultDueDays, timeZone, depositRule),
      );
      setFieldErrors({});
      setFormError(null);
      setBillingExpanded(Boolean(defaults.billingAddress?.line1));
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

  // Preset chips, priced against `depositBasisCents` — `[]` (so the toggle
  // group below renders nothing but "Custom") when there's no basis to take a
  // percentage OF.
  const depositPresets =
    depositBasisCents != null ? computeDepositPresets(depositBasisCents) : [];

  const handleDepositPresetChange = (value: string) => {
    // Radix's `type="single"` `ToggleGroup` re-fires with `""` when the
    // already-pressed item is clicked again (it behaves like a toggle, not a
    // radio) — ignore that rather than clearing the selection to nothing.
    if (!value) return;
    if (value === "custom") {
      setField({ depositPreset: "custom" });
      return;
    }
    const preset = depositPresets.find(
      (candidate) => String(candidate.percent) === value,
    );
    if (!preset) return;
    setField({
      depositPreset: preset.percent,
      amountDollars: centsToDollarsString(preset.amountCents),
    });
    clearError("amountCents");
  };

  // The Amount field's current value as cents, recomputed on every render so
  // the "remaining after this deposit" line and the over-basis warning below
  // track what's typed, not just what was last submitted. `dollarsToCents`
  // never actually returns non-finite (an unparseable string floors to `0`),
  // but the `Number.isFinite` guard is kept so this can't silently start
  // rendering a bogus figure if that contract ever changes.
  const typedAmountCents = dollarsToCents(
    normalizeAmountInput(form.amountDollars),
  );

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

    // Same pre-`safeParse` treatment as the finite check above: the schema
    // has no notion of a deposit basis, so a too-large deposit would
    // otherwise sail through as a "valid" amount and only get caught later,
    // at the QBO API or by the owner's own accounting.
    if (
      form.kind === "deposit" &&
      depositBasisCents != null &&
      dollarsToCents(normalizedAmount) > depositBasisCents
    ) {
      setFieldErrors({
        amountCents: `A deposit can't exceed the quote (${formatPrice(depositBasisCents)})`,
      });
      setFormError(null);
      return;
    }

    // All-or-nothing at the field-group level, same rule the quote
    // calculator's own `address` question uses: a blank street address means
    // "no billing address for this invoice" (the schema's `billingAddress`
    // is optional throughout), never "half an address" reaching Intuit.
    const billingLine1Trimmed = form.billingLine1.trim();
    const billingAddress =
      billingLine1Trimmed === ""
        ? undefined
        : {
            line1: billingLine1Trimmed,
            line2: form.billingLine2.trim() || undefined,
            city: form.billingCity.trim(),
            state: form.billingState.trim(),
            zip: form.billingZip.trim(),
          };

    const parsed = quickBooksCreateInvoiceSchema.safeParse({
      quoteSubmissionId,
      kind: form.kind,
      amountCents: dollarsToCents(normalizedAmount),
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone.trim() || undefined,
      billingAddress,
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
        if (key === "billingAddress") {
          const subKey = issue.path[1];
          if (subKey === "line1")
            nextFieldErrors.billingLine1 ??= issue.message;
          else if (subKey === "line2")
            nextFieldErrors.billingLine2 ??= issue.message;
          else if (subKey === "city")
            nextFieldErrors.billingCity ??= issue.message;
          else if (subKey === "state")
            nextFieldErrors.billingState ??= issue.message;
          else if (subKey === "zip")
            nextFieldErrors.billingZip ??= issue.message;
          else nextFormError ??= issue.message;
        } else if (
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
      // A billing-address error under a collapsed section would otherwise be
      // invisible — expand it so the owner can actually see what to fix.
      if (BILLING_ERROR_KEYS.some((key) => nextFieldErrors[key])) {
        setBillingExpanded(true);
      }
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
            {form.kind === "deposit" && depositBasisCents != null && (
              <div className="space-y-2">
                <Label id="invoice-deposit-preset-label">Deposit</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={String(form.depositPreset)}
                  onValueChange={handleDepositPresetChange}
                  aria-labelledby="invoice-deposit-preset-label"
                  className="flex-wrap"
                  disabled={isPending}
                >
                  {depositPresets.map((preset) => (
                    <ToggleGroupItem
                      key={preset.percent}
                      value={String(preset.percent)}
                      aria-label={`${preset.percent}% deposit, ${formatPrice(preset.amountCents)}`}
                    >
                      {preset.percent}% · {formatPrice(preset.amountCents)}
                    </ToggleGroupItem>
                  ))}
                  <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {form.kind === "final" && billing?.quoteCents != null && (
              <div className="bg-muted/50 space-y-1 rounded-md p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Final quote</span>
                  <span className="tabular-nums">
                    {formatPrice(billing.quoteCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {billing.unpaidDepositCents > 0
                      ? `− Deposits invoiced (${formatPrice(billing.unpaidDepositCents)} unpaid — still collectible in QuickBooks)`
                      : "− Deposits invoiced"}
                  </span>
                  <span className="tabular-nums">
                    {formatPrice(billing.invoicedDepositCents)}
                  </span>
                </div>
                <div className="border-border flex items-center justify-between border-t pt-1 font-medium">
                  <span>= Remaining</span>
                  <span className="tabular-nums">
                    {formatPrice(billing.remainingAfterDepositsCents ?? 0)}
                  </span>
                </div>
              </div>
            )}

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
                      // Typing always drops the deposit selection to
                      // "custom" — even if the typed figure happens to match
                      // a preset, that's a coincidence the UI shouldn't
                      // re-attribute to the chip on the owner's behalf.
                      setField({
                        amountDollars: e.target.value,
                        depositPreset: "custom",
                      });
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
                {form.kind === "deposit" &&
                  depositBasisCents != null &&
                  Number.isFinite(typedAmountCents) &&
                  (typedAmountCents > depositBasisCents ? (
                    <p role="alert" className="text-destructive text-xs">
                      {`A deposit can't exceed the quote (${formatPrice(depositBasisCents)})`}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      {`Remaining after this deposit: ${formatPrice(
                        depositBasisCents - typedAmountCents,
                      )} of ${formatPrice(depositBasisCents)}`}
                    </p>
                  ))}
                {form.kind === "final" &&
                  billing?.remainingAfterDepositsCents != null &&
                  typedAmountCents !== billing.remainingAfterDepositsCents && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      This differs from the computed remaining balance.
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

            <Collapsible
              open={billingExpanded}
              onOpenChange={setBillingExpanded}
              className="border-border rounded-lg border"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="focus-visible:ring-ring flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium focus-visible:ring-1 focus-visible:outline-none"
                >
                  <span>
                    Billing address{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                      billingExpanded && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-border space-y-4 border-t p-3">
                <div className="space-y-2">
                  <Label htmlFor="invoice-billing-line1">Street address</Label>
                  <Input
                    id="invoice-billing-line1"
                    autoComplete="address-line1"
                    value={form.billingLine1}
                    onChange={(e) => {
                      setField({ billingLine1: e.target.value });
                      clearError("billingLine1");
                    }}
                    disabled={isPending}
                    aria-invalid={!!fieldErrors.billingLine1}
                    aria-describedby={
                      fieldErrors.billingLine1
                        ? "invoice-billing-line1-error"
                        : undefined
                    }
                  />
                  {fieldErrors.billingLine1 && (
                    <p
                      id="invoice-billing-line1-error"
                      role="alert"
                      className="text-destructive text-sm"
                    >
                      {fieldErrors.billingLine1}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-billing-line2">
                    Apt / suite{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="invoice-billing-line2"
                    autoComplete="address-line2"
                    value={form.billingLine2}
                    onChange={(e) => {
                      setField({ billingLine2: e.target.value });
                      clearError("billingLine2");
                    }}
                    disabled={isPending}
                    aria-invalid={!!fieldErrors.billingLine2}
                    aria-describedby={
                      fieldErrors.billingLine2
                        ? "invoice-billing-line2-error"
                        : undefined
                    }
                  />
                  {fieldErrors.billingLine2 && (
                    <p
                      id="invoice-billing-line2-error"
                      role="alert"
                      className="text-destructive text-sm"
                    >
                      {fieldErrors.billingLine2}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="invoice-billing-city">City</Label>
                    <Input
                      id="invoice-billing-city"
                      autoComplete="address-level2"
                      value={form.billingCity}
                      onChange={(e) => {
                        setField({ billingCity: e.target.value });
                        clearError("billingCity");
                      }}
                      disabled={isPending}
                      aria-invalid={!!fieldErrors.billingCity}
                      aria-describedby={
                        fieldErrors.billingCity
                          ? "invoice-billing-city-error"
                          : undefined
                      }
                    />
                    {fieldErrors.billingCity && (
                      <p
                        id="invoice-billing-city-error"
                        role="alert"
                        className="text-destructive text-sm"
                      >
                        {fieldErrors.billingCity}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoice-billing-state">State</Label>
                    <Input
                      id="invoice-billing-state"
                      autoComplete="address-level1"
                      maxLength={2}
                      placeholder="MI"
                      value={form.billingState}
                      onChange={(e) => {
                        setField({ billingState: e.target.value });
                        clearError("billingState");
                      }}
                      disabled={isPending}
                      aria-invalid={!!fieldErrors.billingState}
                      aria-describedby={
                        fieldErrors.billingState
                          ? "invoice-billing-state-error"
                          : undefined
                      }
                    />
                    {fieldErrors.billingState && (
                      <p
                        id="invoice-billing-state-error"
                        role="alert"
                        className="text-destructive text-sm"
                      >
                        {fieldErrors.billingState}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-billing-zip">ZIP code</Label>
                  <Input
                    id="invoice-billing-zip"
                    autoComplete="postal-code"
                    value={form.billingZip}
                    onChange={(e) => {
                      setField({ billingZip: e.target.value });
                      clearError("billingZip");
                    }}
                    disabled={isPending}
                    aria-invalid={!!fieldErrors.billingZip}
                    aria-describedby={
                      fieldErrors.billingZip
                        ? "invoice-billing-zip-error"
                        : undefined
                    }
                  />
                  {fieldErrors.billingZip && (
                    <p
                      id="invoice-billing-zip-error"
                      role="alert"
                      className="text-destructive text-sm"
                    >
                      {fieldErrors.billingZip}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

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
