"use client";

import type {
  CustomizerSelection,
  PublicCustomizerDefinition,
} from "~/lib/customizer";
import { evaluateSelection, normalizeSelection } from "~/lib/customizer";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  ProductCustomizer,
  ProductCustomizerTotal,
  useProductCustomizer,
} from "~/components/customizer";

/**
 * The manual order form's "Choose options" dialog: the storefront's headless
 * customizer (same picks, limits and included-charm pricing), opened for one
 * line. Saving hands back the normalized selection — ids and text only;
 * `order.createManual` re-prices it on the server and stores the snapshot.
 *
 * The definition comes from `productOption.forManualOrder`, which lifts
 * stock limits: a manual order records a sale that already happened.
 */
export function ChooseOptionsDialog({
  open,
  onOpenChange,
  productName,
  definition,
  basePrice,
  quantity,
  initialSelection,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  definition: PublicCustomizerDefinition | null;
  /** The line's base unit price in cents (product or chosen variant). */
  basePrice: number;
  quantity: number;
  initialSelection?: CustomizerSelection;
  /** `undefined` = nothing chosen (a plain line). */
  onSave: (configuration: CustomizerSelection | undefined) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose options</DialogTitle>
          <DialogDescription>
            {productName} — prices are checked again when you save the order.
          </DialogDescription>
        </DialogHeader>
        {/* Body mounted only while open, so each opening starts from the
            line's saved picks rather than the last session's edits. */}
        {open && definition && (
          <ChooseOptionsBody
            definition={definition}
            basePrice={basePrice}
            quantity={quantity}
            initialSelection={initialSelection}
            onCancel={() => onOpenChange(false)}
            onSave={(configuration) => {
              onSave(configuration);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChooseOptionsBody({
  definition,
  basePrice,
  quantity,
  initialSelection,
  onCancel,
  onSave,
}: {
  definition: PublicCustomizerDefinition;
  basePrice: number;
  quantity: number;
  initialSelection?: CustomizerSelection;
  onCancel: () => void;
  onSave: (configuration: CustomizerSelection | undefined) => void;
}) {
  const controller = useProductCustomizer({
    customizer: definition,
    basePrice,
    lineQty: quantity,
    initialSelection,
  });

  return (
    <>
      <ProductCustomizer
        controller={controller}
        formatPrice={formatPrice}
        showTray={false}
      />
      <ProductCustomizerTotal
        controller={controller}
        formatPrice={formatPrice}
        label="Each"
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!controller.revealErrors()) return;
            onSave(controller.toCartFields()?.configuration);
          }}
        >
          Save options
        </Button>
      </DialogFooter>
    </>
  );
}

export type ConfiguredLinePreview = {
  /** Base + add-ons when the build prices; the base price otherwise. */
  unitPrice: number;
  /** "Chain: Gold · Charms: Heart, Star"; "" when nothing is chosen. */
  summary: string;
  /** The build is missing required picks or no longer fits the options. */
  invalid: boolean;
};

/**
 * What the manual order form shows for a line of a product with options —
 * the same evaluation the dialog previews, so the row, the totals card and
 * the server (which re-prices from ids) agree.
 */
export function configuredLinePreview(
  definition: PublicCustomizerDefinition,
  configuration: CustomizerSelection | undefined,
  basePrice: number,
  quantity: number,
): ConfiguredLinePreview {
  const selection = normalizeSelection(configuration);
  const result = evaluateSelection(definition, selection, {
    basePrice,
    lineQty: Math.max(1, quantity),
  });

  const parts: string[] = [];
  for (const group of definition.groups) {
    if (group.kind === "text") {
      const text = selection.texts.find((t) => t.groupId === group.id)?.text;
      if (text) parts.push(`${group.name}: “${text}”`);
      continue;
    }
    const ids = new Set(
      selection.choices.find((c) => c.groupId === group.id)?.valueIds ?? [],
    );
    const labels = group.values
      .filter((value) => ids.has(value.id))
      .map((value) => value.label);
    if (labels.length > 0) parts.push(`${group.name}: ${labels.join(", ")}`);
  }

  return {
    unitPrice: result.ok ? result.unitPrice : basePrice,
    summary: parts.join(" · "),
    invalid: !result.ok,
  };
}
