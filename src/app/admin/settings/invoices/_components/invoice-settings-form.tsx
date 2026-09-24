"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { RouterInputs, RouterOutputs } from "~/trpc/react";
import { formatInvoiceNumber } from "~/lib/invoices/number";
import { BPS_DENOMINATOR } from "~/lib/invoices/totals";
import { cn } from "~/lib/utils";
import {
  INVOICE_DUE_TERMS_LABELS,
  INVOICE_NOTES_MAX_LENGTH,
  INVOICE_NUMBER_PREFIX_MAX_LENGTH,
  INVOICE_NUMBER_PREFIX_PATTERN,
  INVOICE_SETTINGS_DUE_TERMS_VALUES,
  INVOICE_TERMS_MAX_LENGTH,
  paymentMethodSchema,
} from "~/lib/validators/invoice";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { NumberFormField } from "~/components/inputs/number-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { PaymentMethodsEditor } from "./payment-methods-editor";

type InvoiceSettingsData = RouterOutputs["invoice"]["getSettings"];
type UpdateSettingsInput = RouterInputs["invoice"]["updateSettings"];

type Props = {
  initial: InvoiceSettingsData;
};

/**
 * `defaultTaxRateBps` on the wire is basis points (625 = 6.25%); the form
 * shows a percent string so `6.25` round-trips to `625` and back without
 * drift (the `Math.round` in `percentStringToBps` is the safety net for
 * float noise like `6.2500000000000009`).
 */
function bpsToPercentString(bps: number): string {
  return (bps / 100).toString();
}

function percentStringToBps(value: string): number {
  const n = Number.parseFloat(value.trim() || "0");
  if (!Number.isFinite(n)) return 0;
  return Math.min(BPS_DENOMINATOR, Math.max(0, Math.round(n * 100)));
}

/**
 * The form's own schema, decoupled from the wire schema
 * (`invoiceSettingsSchema`) exactly like `loyalty-settings.tsx`'s
 * `loyaltySettingsFormSchema` — display-friendly field types here
 * (`defaultTaxRatePercent` as a string), converted to the mutation's shape by
 * `buildPayload` below.
 */
const invoiceSettingsFormSchema = z.object({
  numberPrefix: z
    .string()
    .trim()
    .max(
      INVOICE_NUMBER_PREFIX_MAX_LENGTH,
      `Prefix must be ${INVOICE_NUMBER_PREFIX_MAX_LENGTH} characters or fewer`,
    )
    .regex(
      INVOICE_NUMBER_PREFIX_PATTERN,
      "Use letters, numbers, and # - _ . / only",
    ),
  numberPadding: z.number().int().min(1).max(8),
  startingNumber: z.number().int().min(1).max(9_999_999),
  defaultDueTerms: z.enum(INVOICE_SETTINGS_DUE_TERMS_VALUES),
  defaultTaxRatePercent: z.string().superRefine((value, ctx) => {
    const n = Number.parseFloat(value.trim() || "0");
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a percent between 0 and 100",
      });
    }
  }),
  defaultNotes: z
    .string()
    .max(INVOICE_NOTES_MAX_LENGTH, "Default notes are too long"),
  defaultTerms: z
    .string()
    .max(INVOICE_TERMS_MAX_LENGTH, "Default terms are too long"),
  paymentMethods: z.array(paymentMethodSchema),
  overdueAlertsEnabled: z.boolean(),
  weeklyDigestEnabled: z.boolean(),
});

export type InvoiceSettingsFormValues = z.infer<
  typeof invoiceSettingsFormSchema
>;

function defaultValuesFor(
  data: InvoiceSettingsData,
): InvoiceSettingsFormValues {
  return {
    numberPrefix: data.numberPrefix,
    numberPadding: data.numberPadding,
    startingNumber: data.startingNumber,
    defaultDueTerms: data.defaultDueTerms,
    defaultTaxRatePercent: bpsToPercentString(data.defaultTaxRateBps),
    defaultNotes: data.defaultNotes ?? "",
    defaultTerms: data.defaultTerms ?? "",
    paymentMethods: data.paymentMethods,
    overdueAlertsEnabled: data.overdueAlertsEnabled,
    weeklyDigestEnabled: data.weeklyDigestEnabled,
  };
}

function buildPayload(data: InvoiceSettingsFormValues): UpdateSettingsInput {
  return {
    numberPrefix: data.numberPrefix,
    numberPadding: data.numberPadding,
    startingNumber: data.startingNumber,
    defaultDueTerms: data.defaultDueTerms,
    defaultTaxRateBps: percentStringToBps(data.defaultTaxRatePercent),
    defaultNotes: data.defaultNotes,
    defaultTerms: data.defaultTerms,
    paymentMethods: data.paymentMethods,
    overdueAlertsEnabled: data.overdueAlertsEnabled,
    weeklyDigestEnabled: data.weeklyDigestEnabled,
  };
}

const DUE_TERMS_OPTIONS = INVOICE_SETTINGS_DUE_TERMS_VALUES.map((value) => ({
  value,
  label: INVOICE_DUE_TERMS_LABELS[value],
}));

export function InvoiceSettingsForm({ initial }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(invoiceSettingsFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: defaultValuesFor(initial),
  });

  const updateSettings = api.invoice.updateSettings.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Invoice settings saved");
      form.reset(defaultValuesFor(data));
      void utils.invoice.getSettings.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update invoice settings");
    },
    onMutate: () => toast.loading("Saving invoice settings..."),
  });

  const handleSubmit = async (data: InvoiceSettingsFormValues) => {
    updateSettings.mutate(buildPayload(data));
  };

  const handleReset = () => {
    form.reset(defaultValuesFor(initial));
  };

  const [prefix, padding, startingNumber] = form.watch([
    "numberPrefix",
    "numberPadding",
    "startingNumber",
  ]);
  const previewNumber = Math.max(
    initial.nextInvoiceNumber,
    Number.isFinite(startingNumber) ? startingNumber : initial.startingNumber,
  );
  const previewDisplayNumber = formatInvoiceNumber(
    prefix,
    previewNumber,
    Number.isFinite(padding) ? padding : initial.numberPadding,
  );

  const isDirty = form.formState.isDirty;
  const isSubmitting = updateSettings.isPending;

  useKeyboardEnter(form, handleSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="bg-muted min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Invoice settings</h1>
              <span
                className={`admin-status-badge ${
                  isDirty ? "isDirty" : "isPublished"
                }`}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={handleReset}
              className="hidden md:inline-flex"
            >
              Reset
            </Button>

            <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Save changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              These settings shape every new invoice — numbering, defaults,
              reminders and how customers can pay you.
            </p>

            {/* Numbering */}
            <Card>
              <CardHeader>
                <CardTitle>Numbering</CardTitle>
                <CardDescription>
                  Changing these never renumbers invoices you&apos;ve already
                  created.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid items-start gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="numberPrefix"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Prefix</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-" {...field} />
                        </FormControl>
                        <FormDescription>
                          Shown before every invoice number, e.g. INV-0007
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <NumberFormField
                    form={form}
                    name="numberPadding"
                    label="Zero-padding"
                    min={1}
                    max={8}
                    className="sm:col-span-1"
                    description="Digits shown, e.g. 4 → 0007"
                  />
                  <NumberFormField
                    form={form}
                    name="startingNumber"
                    label="Starting number"
                    min={1}
                    max={9_999_999}
                    className="sm:col-span-1"
                    description="A floor for new invoices, not a counter."
                  />
                </div>

                <p className="text-muted-foreground text-sm">
                  Next invoice:{" "}
                  <span className="text-foreground font-medium">
                    {previewDisplayNumber}
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Defaults */}
            <Card>
              <CardHeader>
                <CardTitle>Defaults</CardTitle>
                <CardDescription>
                  Prefilled on every new invoice — change any of them per
                  invoice while building it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectFormField
                    form={form}
                    name="defaultDueTerms"
                    label="Default due terms"
                    values={DUE_TERMS_OPTIONS}
                  />

                  <FormField
                    control={form.control}
                    name="defaultTaxRatePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default tax rate</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              className="pr-7"
                              {...field}
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <TextareaFormField
                  form={form}
                  name="defaultNotes"
                  label="Default notes"
                  placeholder="Shown to the customer on the invoice"
                  rows={3}
                />
                <TextareaFormField
                  form={form}
                  name="defaultTerms"
                  label="Default terms"
                  placeholder="Optional — e.g. late fees, refund policy"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Reminders */}
            <Card>
              <CardHeader>
                <CardTitle>Reminders</CardTitle>
                <CardDescription>
                  Customers never get automatic emails — only what you send by
                  hand from an invoice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SwitchFormField
                  form={form}
                  name="overdueAlertsEnabled"
                  label="Email me when an invoice becomes past due"
                />
                <SwitchFormField
                  form={form}
                  name="weeklyDigestEnabled"
                  label="Weekly summary every Monday morning"
                  description="Outstanding, overdue and collected totals for the past week, in your business's time zone."
                />
              </CardContent>
            </Card>

            {/* Payment methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment methods</CardTitle>
                <CardDescription>
                  Choose which of these to offer on each invoice while building
                  it. Order here is the order shown on invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsEditor
                  venmoHandle={initial.venmoHandle}
                  cashAppHandle={initial.cashAppHandle}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
