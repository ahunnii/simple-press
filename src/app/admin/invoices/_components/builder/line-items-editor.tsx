"use client";

import type { UseFormReturn } from "react-hook-form";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";

import type { CatalogPickResult } from "./catalog-picker";
import type { InvoiceBuilderValues } from "./types";
import { computeLineAmountCents } from "~/lib/invoices/totals";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { INVOICE_MAX_LINE_ITEMS } from "~/lib/validators/invoice";
import { Button } from "~/components/ui/button";
import { FormField, FormItem, FormMessage } from "~/components/ui/form";
import { MoneyInput } from "~/components/ui/money-input";
import { NumberFormField } from "~/components/inputs/number-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { CatalogPicker } from "./catalog-picker";
import { centsToMoneyInputValue, moneyInputValueToCents } from "./money";

/** The DOM id of a row's price input, so a catalog pick with no known price can focus it directly. */
function priceInputId(lineId: string): string {
  return `invoice-line-price-${lineId}`;
}

function emptyLine(): InvoiceBuilderValues["lineItems"][number] {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPriceCents: 0,
  };
}

export function LineItemsEditor({
  form,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const canRemove = fields.length > 1;

  const addBlankLine = () => {
    if (fields.length >= INVOICE_MAX_LINE_ITEMS) return;
    append(emptyLine());
  };

  const addFromCatalog = (pick: CatalogPickResult) => {
    if (fields.length >= INVOICE_MAX_LINE_ITEMS) return;
    const id = crypto.randomUUID();
    append({
      id,
      description: pick.description,
      quantity: 1,
      unitPriceCents: pick.unitPriceCents,
      ...(pick.productId ? { productId: pick.productId } : {}),
      ...(pick.variantId ? { variantId: pick.variantId } : {}),
      ...(pick.serviceItemId ? { serviceItemId: pick.serviceItemId } : {}),
    });
    if (pick.focusPrice) {
      // The new row hasn't mounted yet — wait a frame, then focus it by the
      // id we just generated (known upfront, so no ref plumbing needed).
      requestAnimationFrame(() => {
        document.getElementById(priceInputId(id))?.focus();
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fields.map((row, index) => (
          <LineItemRow
            key={row.id}
            form={form}
            index={index}
            isFirst={index === 0}
            isLast={index === fields.length - 1}
            showColumnLabels={index === 0}
            canRemove={canRemove}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      {/* Array-level errors ("Add at least one line item", "at most 100
          lines") attach to `lineItems` itself. */}
      <FormField
        control={form.control}
        name="lineItems"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={fields.length >= INVOICE_MAX_LINE_ITEMS}
          onClick={addBlankLine}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add line
        </Button>
        <CatalogPicker
          onPick={addFromCatalog}
          disabled={fields.length >= INVOICE_MAX_LINE_ITEMS}
        />
      </div>
    </div>
  );
}

function LineItemRow({
  form,
  index,
  isFirst,
  isLast,
  showColumnLabels,
  canRemove,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  /** Only the first row shows visible field labels (acting as column headers); every row keeps them for screen readers. */
  showColumnLabels: boolean;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const line = useWatch({ control: form.control, name: `lineItems.${index}` });
  const amountCents = computeLineAmountCents(
    Number(line?.quantity) || 0,
    Number(line?.unitPriceCents) || 0,
  );
  const lineNumber = index + 1;
  // Below `@3xl/line-item` (the row's own width, not the viewport — see the
  // container query on the wrapping div) every row is a stacked card and
  // needs its own visible labels. At `@3xl/line-item` and up, rows become one
  // grid line with a single header row of labels, so only the first row's
  // labels stay visible — later rows keep them for screen readers only.
  const hiddenLabelClassName = showColumnLabels
    ? undefined
    : "@3xl/line-item:sr-only";

  return (
    // `@container/line-item` makes the breakpoint below react to this row's
    // OWN rendered width rather than the viewport. The admin shell's sidebar
    // means the builder's content column is often much narrower than the
    // viewport (e.g. a ~700px column on a ~1200px screen) — a viewport
    // breakpoint like the old `sm:` would flip to the wide single-row grid
    // while the row is still too narrow for it, squeezing Qty/Unit
    // price/Amount/actions into overlapping columns.
    <div className="@container/line-item rounded-lg border p-3">
      <div className="grid grid-cols-1 gap-3 @3xl/line-item:grid-cols-[minmax(0,1fr)_90px_130px_100px_auto] @3xl/line-item:items-start">
        <div>
          <TextareaFormField
            form={form}
            name={`lineItems.${index}.description`}
            label="Description"
            labelClassName={hiddenLabelClassName}
            rows={1}
            className="space-y-1"
            textareaClassName="min-h-9 resize-y"
          />
        </div>

        {/* Narrow: Qty and Unit price share a row (two equal columns), then
            Amount and the row actions share the row below — four numeric/
            icon controls side by side left too little room for the price
            input to show its typed value. Wide: nested `display: contents`
            dissolves both wrapper levels below, so all four children land
            directly in the outer grid's remaining four columns, one row. */}
        <div className="grid grid-cols-2 items-start gap-3 @3xl/line-item:contents">
          {/* Wrapped in a plain div, like Description above — `NumberFormField`
              defaults to `col-span-full`, which would otherwise make this row
              span every column of whichever grid it's a direct child of
              (this div at narrow widths, the outer 5-column grid once
              `contents` dissolves the wrapper above). */}
          <div>
            <NumberFormField
              form={form}
              name={`lineItems.${index}.quantity`}
              label="Qty"
              labelClassName={hiddenLabelClassName}
              min={0.001}
              step={0.001}
              className="space-y-1"
            />
          </div>

          <FormField
            control={form.control}
            name={`lineItems.${index}.unitPriceCents`}
            render={({ field }) => (
              <FormItem className="space-y-1">
                <label
                  className={cn(
                    "text-sm leading-none font-medium",
                    hiddenLabelClassName,
                  )}
                >
                  Unit price
                </label>
                <MoneyInput
                  id={priceInputId(line?.id ?? "")}
                  value={centsToMoneyInputValue(field.value)}
                  onChange={(dollars) =>
                    field.onChange(moneyInputValueToCents(dollars))
                  }
                  onBlur={field.onBlur}
                  aria-label={`Unit price for line ${lineNumber}`}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Narrow: Amount (left) and the row actions (right) share this
              row, spanning both columns above. Wide: `contents` dissolves
              this too, promoting Amount and the actions individually into
              the outer grid's last two columns. */}
          <div className="col-span-2 flex items-center justify-between gap-3 @3xl/line-item:contents">
            <div className="flex flex-col gap-1 @3xl/line-item:pt-6">
              <span
                className={cn(
                  "text-muted-foreground text-xs",
                  hiddenLabelClassName,
                )}
              >
                Amount
              </span>
              <span className="font-medium tabular-nums">
                {formatPrice(amountCents)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1 @3xl/line-item:pt-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isFirst}
                onClick={onMoveUp}
                aria-label={`Move line ${lineNumber} up`}
              >
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isLast}
                onClick={onMoveDown}
                aria-label={`Move line ${lineNumber} down`}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8"
                disabled={!canRemove}
                onClick={onRemove}
                aria-label={`Remove line ${lineNumber}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
