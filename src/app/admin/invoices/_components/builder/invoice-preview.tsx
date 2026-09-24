"use client";

import type { UseFormReturn } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";

import type { InvoicePreviewIssuer } from "../build-preview-issuer";
import type { InvoiceBuilderValues } from "./types";
import type { InvoiceDocumentLineItem } from "~/components/invoices/invoice-document";
import type { InvoicePaymentMethod } from "~/lib/validators/invoice";
import { zonedCalendarDate } from "~/lib/calendar-date";
import { buildPaymentInstructions } from "~/lib/invoices/payment-methods";
import { resolveDueDateYmd } from "~/lib/invoices/status";
import {
  computeInvoiceTotals,
  computeLineAmountCents,
} from "~/lib/invoices/totals";
import { InvoiceDocument } from "~/components/invoices/invoice-document";

import { formatYmdLabel } from "../../[id]/_components/format";
import { PaymentInstructionsList } from "../../[id]/_components/payment-instructions-list";
import { invoiceTotalsLabels } from "../invoice-totals-labels";

type WatchedLine = InvoiceBuilderValues["lineItems"][number] | undefined;

/**
 * A line with neither a description nor a price typed in yet is just an
 * untouched blank row (a fresh row defaults to `quantity: 1`, so quantity
 * alone can't tell "blank" from "one of something free") — it wouldn't mean
 * anything on a real invoice, so the preview skips it rather than showing a
 * $0.00 row for every line the owner hasn't gotten to.
 */
function isBlankLine(line: WatchedLine): boolean {
  const hasDescription = Boolean(line?.description?.trim());
  const hasPrice = Number(line?.unitPriceCents) > 0;
  return !hasDescription && !hasPrice;
}

/**
 * Live preview of the invoice being built — the exact `InvoiceDocument` a
 * customer would see, kept in sync with the form via its own `useWatch` so
 * typing anywhere in the builder never re-renders the surrounding form, only
 * this component.
 */
export function InvoicePreview({
  form,
  methods,
  issuer,
  timeZone,
  displayNumber,
  scaleToFitWidth,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
  methods: InvoicePaymentMethod[];
  issuer: InvoicePreviewIssuer;
  timeZone: string;
  displayNumber: string;
  /**
   * Render the document at this fixed CSS-px width and shrink the whole
   * thing with a `transform: scale()` (measured via `ResizeObserver`) to fit
   * whatever column it's dropped into — for the narrow desktop sidebar,
   * where `InvoiceDocument`'s real width would otherwise be cramped.
   *
   * Omit it to render at the CONTAINER's own natural width, unscaled — for
   * the full-width mobile "Preview" tab. `InvoiceDocument`'s few responsive
   * rules are plain viewport breakpoints (`sm:`, not container queries), so
   * a scaled-down fixed-width render on an actual desktop viewport still
   * gets the desktop layout, just shrunk — exactly what a narrow *phone*
   * viewport must NOT get: it needs the real mobile layout those `sm:` rules
   * fall back to, which only happens by rendering un-transformed at the
   * phone's own width.
   */
  scaleToFitWidth?: number;
}) {
  const [
    customer,
    lineItems,
    discountType,
    discountValue,
    taxRateBps,
    dueTerms,
    customDueDate,
    paymentMethodIds,
    notes,
    terms,
  ] = useWatch({
    control: form.control,
    name: [
      "customer",
      "lineItems",
      "discountType",
      "discountValue",
      "taxRateBps",
      "dueTerms",
      "customDueDate",
      "paymentMethodIds",
      "notes",
      "terms",
    ],
  });

  const documentProps = useMemo(() => {
    const safeLineItems = lineItems ?? [];
    const visibleLines = safeLineItems.filter((line) => !isBlankLine(line));

    const previewLineItems: InvoiceDocumentLineItem[] =
      visibleLines.length > 0
        ? visibleLines.map((line, index) => ({
            id: line?.id ?? String(index),
            description: line?.description?.trim() || "Untitled item",
            quantity: Number(line?.quantity) || 0,
            unitPriceCents: Number(line?.unitPriceCents) || 0,
            amountCents: computeLineAmountCents(
              Number(line?.quantity) || 0,
              Number(line?.unitPriceCents) || 0,
            ),
          }))
        : [
            {
              id: "placeholder",
              description: "Add a line item",
              quantity: 0,
              unitPriceCents: 0,
              amountCents: 0,
              muted: true,
            },
          ];

    const totals = computeInvoiceTotals({
      lineItems: safeLineItems.map((line) => ({
        quantity: Number(line?.quantity) || 0,
        unitPriceCents: Number(line?.unitPriceCents) || 0,
      })),
      discountType: discountType ?? null,
      discountValue: discountValue ?? 0,
      taxRateBps: taxRateBps ?? 0,
    });

    const { discountLabel, taxRateLabel } = invoiceTotalsLabels({
      discountType: discountType ?? null,
      discountValue: discountValue ?? 0,
      taxRateBps: taxRateBps ?? 0,
    });

    // A draft has no issue date yet — it previews as "issued today", the
    // date it would actually get if sent right now.
    const todayYmd = zonedCalendarDate(new Date(), timeZone);
    const issueDateLabel = formatYmdLabel(todayYmd);
    const dueYmd = resolveDueDateYmd(
      dueTerms ?? "receipt",
      todayYmd,
      customDueDate,
    );
    const dueDateLabel = dueYmd
      ? dueTerms === "custom"
        ? formatYmdLabel(dueYmd)
        : `${formatYmdLabel(dueYmd)} (if sent today)`
      : undefined;

    const billingAddress = customer?.billingAddress;
    const billToAddressLines = billingAddress
      ? [
          billingAddress.line1,
          billingAddress.line2,
          [billingAddress.city, billingAddress.state, billingAddress.zip]
            .filter(Boolean)
            .join(", "),
        ].filter((line): line is string => Boolean(line?.trim()))
      : [];

    const selectedIds = paymentMethodIds ?? [];
    const instructions = buildPaymentInstructions(methods, selectedIds, {
      businessName: issuer.businessName,
      displayNumber,
    });
    const paymentSlot =
      instructions.length > 0 ? (
        <PaymentInstructionsList instructions={instructions} />
      ) : (
        <p className="text-sm text-neutral-500">No payment methods selected.</p>
      );

    return {
      invoiceNumber: displayNumber,
      status: { label: "Draft", tone: "neutral" as const },
      issueDateLabel,
      dueDateLabel,
      issuer,
      billTo: {
        name: customer?.name ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? null,
        addressLines: billToAddressLines,
      },
      lineItems: previewLineItems,
      totals: {
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        discountLabel,
        taxCents: totals.taxCents,
        taxRateLabel,
        totalCents: totals.totalCents,
        balanceDueCents: totals.totalCents,
      },
      notes,
      terms,
      accentColor: issuer.accentColor ?? undefined,
      paymentSlot,
    };
  }, [
    customer,
    lineItems,
    discountType,
    discountValue,
    taxRateBps,
    dueTerms,
    customDueDate,
    paymentMethodIds,
    notes,
    terms,
    methods,
    issuer,
    timeZone,
    displayNumber,
  ]);

  // Scale-to-fit (desktop sidebar only, when `scaleToFitWidth` is given): the
  // document renders at its real, fixed width in a detached-from-layout
  // inner box, and a CSS `transform: scale()` shrinks it to whatever the
  // outer column measures. The outer box's height is set explicitly to the
  // SCALED height (`ResizeObserver` on the inner box gives the unscaled
  // height), because `transform` doesn't change the space an element
  // reserves in normal flow — without this the outer box would still reserve
  // the document's full, unscaled height and leave a gap under it.
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    if (scaleToFitWidth === undefined) return;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const outerWidth = outer.clientWidth;
      if (outerWidth > 0) {
        setScale(Math.min(1, outerWidth / scaleToFitWidth));
      }
      setNaturalHeight(inner.scrollHeight);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [scaleToFitWidth]);

  // Mobile "Preview" tab: no fixed width, no transform. The document renders
  // at the container's own (real, phone-width) size, so its `sm:` breakpoints
  // see the actual narrow viewport and fall back to their mobile layout —
  // the same one the hosted `/invoice/[token]` page already renders well at
  // 375px. Scaling a fixed-816px render down to fit a 375px screen would
  // instead keep the DESKTOP layout, just shrunk to illegibly small text.
  if (scaleToFitWidth === undefined) {
    return (
      <div className="rounded-md border bg-white p-4 shadow-sm sm:p-8">
        <InvoiceDocument {...documentProps} />
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden"
      style={{ height: naturalHeight ? naturalHeight * scale : undefined }}
    >
      <div
        ref={innerRef}
        className="origin-top-left rounded-md border bg-white p-8 shadow-sm"
        style={{ width: scaleToFitWidth, transform: `scale(${scale})` }}
      >
        <InvoiceDocument {...documentProps} />
      </div>
    </div>
  );
}
