"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { InvoicePreviewIssuer } from "../build-preview-issuer";
import type { InvoiceBuilderValues } from "./types";
import type { InvoicePaymentMethod } from "~/lib/validators/invoice";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { formatInvoiceNumber } from "~/lib/invoices/number";
import { cn } from "~/lib/utils";
import { invoiceDraftSchema } from "~/lib/validators/invoice";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { CustomerField } from "./customer-field";
import { DueTermsField } from "./due-terms-field";
import { InvoicePreview } from "./invoice-preview";
import { LineItemsEditor } from "./line-items-editor";
import {
  bpsToPercentInputValue,
  centsToMoneyInputValue,
  moneyInputValueToCents,
  percentInputValueToBps,
} from "./money";
import { PaymentMethodChecklist } from "./payment-method-checklist";
import { PercentInput } from "./percent-input";
import { TotalsPanel } from "./totals-panel";

/** Which half of the builder is showing below the `xl` breakpoint, where the
 * form and the live preview can't sit side by side. */
type MobileView = "edit" | "preview";

type BuilderSettings = {
  numberPrefix: string;
  numberPadding: number;
  /** What `invoice.create` would assign right now — for the "assigned on save" header. */
  nextInvoiceNumber: number;
  paymentMethods: InvoicePaymentMethod[];
};

type ExistingInvoice = {
  id: string;
  displayNumber: string;
};

export function InvoiceBuilderForm({
  settings,
  initialValues,
  existingInvoice,
  previewIssuer,
  timeZone,
}: {
  settings: BuilderSettings;
  initialValues: InvoiceBuilderValues;
  existingInvoice?: ExistingInvoice;
  /** The business's current public identity, for the live preview's issuer
   * block — a draft has no `issuerSnapshot` yet, so it always previews with
   * "what sending it right now would show". */
  previewIssuer: InvoicePreviewIssuer;
  /** The business's IANA zone, so "Issued today" and the estimated due date
   * land on the day it actually is for the owner, not for this server. */
  timeZone: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [mobileView, setMobileView] = useState<MobileView>("edit");

  const rhf = useForm<InvoiceBuilderValues>({
    resolver: zodResolver(invoiceDraftSchema),
    mode: "onTouched",
    defaultValues: initialValues,
  });

  // Only what the JSX below still needs to watch directly: the discount
  // type's `Select` value and the conditional amount/percent field it shows.
  // Everything totals-related now lives in `TotalsPanel`/`InvoicePreview`,
  // each with its own isolated `useWatch` — so typing a price or a line
  // description no longer re-renders this whole form, just those two.
  const discountType = rhf.watch("discountType");

  const createMutation = api.invoice.create.useMutation({
    onMutate: loadingToast("Creating invoice…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(`Invoice ${data.displayNumber} created`);
      void utils.invoice.invalidate();
      rhf.reset(rhf.getValues());
      router.push(`/admin/invoices/${data.id}`);
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(rhf, error, {
        fallbackMessage: "Failed to create invoice",
      });
    },
  });

  const updateMutation = api.invoice.update.useMutation({
    onMutate: loadingToast("Saving invoice…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice saved");
      void utils.invoice.invalidate();
      rhf.reset(rhf.getValues());
      if (existingInvoice) {
        router.push(`/admin/invoices/${existingInvoice.id}`);
      }
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(rhf, error, {
        fallbackMessage: "Failed to save invoice",
      });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDirty = rhf.formState.isDirty;
  useDirtyForm(isDirty);

  const onSubmit = (values: InvoiceBuilderValues) => {
    const parsed = invoiceDraftSchema.parse(values);
    if (existingInvoice) {
      updateMutation.mutate({ id: existingInvoice.id, ...parsed });
    } else {
      createMutation.mutate(parsed);
    }
  };

  // What `invoice.create` would assign right now — same number either way,
  // just without the header's "(assigned on save)" qualifier, since the
  // preview is a mock of the real thing rather than a note about it.
  const previewDisplayNumber = existingInvoice
    ? existingInvoice.displayNumber
    : formatInvoiceNumber(
        settings.numberPrefix,
        settings.nextInvoiceNumber,
        settings.numberPadding,
      );

  const headerNumberLabel = existingInvoice
    ? existingInvoice.displayNumber
    : `${previewDisplayNumber} (assigned on save)`;

  const cancelHref = existingInvoice
    ? `/admin/invoices/${existingInvoice.id}`
    : "/admin/invoices";

  return (
    <Form {...rhf}>
      <form
        onSubmit={(event) =>
          void rhf.handleSubmit(onSubmit, () => {
            toast.error("Please fix the highlighted fields and try again.");
          })(event)
        }
        className={cn(
          "admin-container space-y-6",
          // Room for the fixed mobile-edit total bar below, so it never
          // covers the last card. `xl:pb-0` clears it once that bar is
          // `xl:hidden` anyway.
          mobileView === "edit" && "pb-24 xl:pb-0",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {existingInvoice ? "Editing draft" : "New invoice"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {headerNumberLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </div>

        {/* Below `xl` the form and the live preview can't sit side by side,
            so this swaps between them. A real Radix tablist — proper
            `aria-selected` and arrow-key support — but it only drives plain
            CSS visibility below (see the two panes' `hidden` classes) rather
            than Radix's own content mounting, so the form's fields (and the
            line items' `useFieldArray`) never lose their registration while
            hidden. */}
        <Tabs
          value={mobileView}
          onValueChange={(value) => setMobileView(value as MobileView)}
          className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 -mx-4 px-4 py-2 backdrop-blur xl:hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_560px]">
          <div
            className={cn(
              "space-y-6",
              mobileView === "preview" && "hidden xl:block",
            )}
          >
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerField form={rhf} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Line items</CardTitle>
                <CardDescription>
                  What the customer is being billed for.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineItemsEditor form={rhf} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discount &amp; tax</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-discount-type">Discount</Label>
                  <Select
                    value={discountType ?? "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        rhf.setValue("discountType", null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        rhf.setValue("discountValue", 0, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      } else {
                        rhf.setValue(
                          "discountType",
                          value as "flat" | "percent",
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id="invoice-discount-type"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No discount</SelectItem>
                      <SelectItem value="flat">Amount ($)</SelectItem>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {discountType === "flat" && (
                  <FormField
                    control={rhf.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount amount</FormLabel>
                        <FormControl>
                          <MoneyInput
                            value={centsToMoneyInputValue(field.value)}
                            onChange={(dollars) =>
                              field.onChange(moneyInputValueToCents(dollars))
                            }
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {discountType === "percent" && (
                  <FormField
                    control={rhf.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount percent</FormLabel>
                        <FormControl>
                          <PercentInput
                            value={bpsToPercentInputValue(field.value)}
                            onChange={(percent) =>
                              field.onChange(percentInputValueToBps(percent))
                            }
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={rhf.control}
                  name="taxRateBps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax rate</FormLabel>
                      <FormControl>
                        <PercentInput
                          value={bpsToPercentInputValue(field.value)}
                          onChange={(percent) =>
                            field.onChange(percentInputValueToBps(percent))
                          }
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Due date</CardTitle>
              </CardHeader>
              <CardContent>
                <DueTermsField form={rhf} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment methods</CardTitle>
                <CardDescription>
                  Shown to the customer when this invoice is sent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodChecklist
                  form={rhf}
                  methods={settings.paymentMethods}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes &amp; terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TextareaFormField
                  form={rhf}
                  name="notes"
                  label="Notes"
                  placeholder="Thank you for your business!"
                  rows={3}
                />
                <TextareaFormField
                  form={rhf}
                  name="terms"
                  label="Terms"
                  placeholder="Payment is due within the terms above."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Desktop preview sidebar — always shown at `xl`+, regardless of
              `mobileView` (that state only matters below `xl`, where this is
              hidden entirely in favor of the full-width panel below). Scaled
              down from a 680px render, narrower than the document's usual
              816px so it stays legible at the sidebar's actual width instead
              of shrinking a full-size page to near-illegible text. */}
          <div className="hidden flex-col gap-4 xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100vh-7rem)]">
            {/* Full breakdown lives in the document preview itself; this
                stays pinned above its scroll area so the total is never
                scrolled out of view. */}
            <div className="shrink-0">
              <TotalsPanel form={rhf} />
            </div>
            <div
              role="region"
              aria-label="Invoice preview"
              className="bg-muted/30 min-h-0 flex-1 overflow-y-auto rounded-lg border p-3 xl:p-4"
            >
              <InvoicePreview
                form={rhf}
                methods={settings.paymentMethods}
                issuer={previewIssuer}
                timeZone={timeZone}
                displayNumber={previewDisplayNumber}
                scaleToFitWidth={680}
              />
            </div>
          </div>

          {/* Mobile "Preview" tab — full width, unscaled, real document
              layout at the phone's own viewport (see `InvoicePreview`'s
              `scaleToFitWidth` doc). Only mounted while actually showing: it
              holds no form state of its own, so remounting on toggle is
              free, unlike the form column which must stay mounted for its
              field-array registration. */}
          {mobileView === "preview" && (
            <div
              role="region"
              aria-label="Invoice preview"
              className="xl:hidden"
            >
              <InvoicePreview
                form={rhf}
                methods={settings.paymentMethods}
                issuer={previewIssuer}
                timeZone={timeZone}
                displayNumber={previewDisplayNumber}
              />
            </div>
          )}
        </div>

        {/* Sticky bottom bar, mobile Edit mode only — the form's cards can
            run long, so the total (and a way to save) stays reachable
            without scrolling all the way down. Genuinely `<form>`-nested
            (just fixed-positioned out of flow), so this submit button
            triggers the same `handleSubmit` as the header's. */}
        {mobileView === "edit" && (
          <div className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t px-4 py-3 backdrop-blur xl:hidden">
            <div className="flex-1">
              <TotalsPanel form={rhf} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save draft"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
