"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type {
  FormProductImage,
  FormVariant,
  FormVariantOption,
} from "../_validators/schema";
import { cn, formatCurrency } from "~/lib/utils";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import { NumberInput } from "~/components/ui/number-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { WARNING_TEXT } from "../../_components/admin-table-style";
import { AdminThumb } from "../../_components/admin-thumb";

const MAX_VARIANTS = 100;

/**
 * A row's React key. Keying by array index re-associates the SKU/price/stock
 * inputs with the wrong variant the moment a mid-list row is deleted, so rows
 * are keyed by something that travels with the data instead: the saved variant
 * id when there is one, otherwise the option combination — fixed at generation
 * time, since nothing in this component edits `options` (only sku, price,
 * compare-at, stock, and image are editable per row).
 *
 * Unsaved rows can't carry a generated id: `FormVariant` lives in
 * `../_validators/schema` and has no field for one. Variants that share an
 * identity (legacy rows imported with an empty `options` map) fall back to a
 * numbered suffix — those rows are indistinguishable by any other means anyway.
 */
function variantRowIdentity(variant: FormVariant): string {
  if (variant.id) return `id:${variant.id}`;
  const entries = Object.entries(variant.options ?? {})
    .map(([name, value]) => `${name}=${value}`)
    .sort();
  return `opts:${entries.join("|")}`;
}

function buildVariantRowKeys(variants: FormVariant[]): string[] {
  const seen = new Map<string, number>();
  return variants.map((variant) => {
    const identity = variantRowIdentity(variant);
    const dupes = seen.get(identity) ?? 0;
    seen.set(identity, dupes + 1);
    return dupes === 0 ? identity : `${identity}#${dupes}`;
  });
}

/**
 * Option-editor rows are local state and never leave this component, so unlike
 * variants they can carry a real synthetic key.
 */
let optionRowSeq = 0;
const nextOptionRowKey = () => `option-${(optionRowSeq += 1)}`;
type EditableOption = FormVariantOption & { key: string };

/**
 * Both bulk apply handlers used to `return` silently on an invalid value while
 * their buttons stayed enabled — clicking "Set Price" with a negative number
 * did nothing and said nothing. These two functions now drive the disabled
 * state, the inline reason, and the backstop guard inside the handlers, so all
 * three can never disagree.
 *
 * `null` (nothing entered) is not an issue: the button is disabled for it
 * separately, and nagging before the owner has typed anything is noise.
 */
function bulkPriceIssue(dollars: number | null): string | null {
  if (dollars === null) return null;
  if (!Number.isFinite(dollars)) return "Enter a valid price.";
  if (dollars < 0) return "Price can't be negative.";
  if (dollars === 0)
    return "Price must be more than $0. Clear a variant's price instead to inherit the base price.";
  return null;
}

function bulkQtyIssue(qty: number | null): string | null {
  if (qty === null) return null;
  if (!Number.isFinite(qty)) return "Enter a valid stock quantity.";
  if (qty < 0) return "Stock can't be negative.";
  if (!Number.isInteger(qty)) return "Stock must be a whole number.";
  return null;
}

/** Selected rows whose existing compare-at price would end up <= `cents`. */
function countComparePriceConflicts(
  variants: FormVariant[],
  selectedIndices: Set<number>,
  cents: number,
): number {
  return variants.filter(
    (variant, index) =>
      selectedIndices.has(index) &&
      variant.compareAtPrice != null &&
      variant.compareAtPrice <= cents,
  ).length;
}

type Props = {
  variants: FormVariant[];
  onChange: (variants: FormVariant[]) => void;
  /** When false, per-variant stock fields are hidden (unlimited stock). */
  trackInventory?: boolean;
  basePrice: number; // in cents
  existingVariantOptions: FormVariantOption[];
  images: FormProductImage[];
  /**
   * Row index → message. Built by the parent form from a
   * `z.array(variantSchema)` parse, where `issue.path[0]` is the row index.
   * Optional so either side can land first without breaking the build.
   */
  errors?: Record<number, string>;
};

export function VariantManager({
  variants,
  onChange,
  trackInventory = false,
  basePrice,
  existingVariantOptions,
  images,
  errors,
}: Props) {
  // `getExistingVariantOptions` returns `[]` for a new product, never nullish,
  // so the old `??` fallback never fired and the editor opened with zero rows —
  // "Generate Variants" then errored until the owner clicked "Add Option".
  const initialOptions: FormVariantOption[] =
    existingVariantOptions.length > 0
      ? existingVariantOptions
      : [{ name: "Size", values: [] }];
  const [variantOptions, setVariantOptions] = useState<EditableOption[]>(() =>
    initialOptions.map((option) => ({ ...option, key: nextOptionRowKey() })),
  );
  const [rawValuesInputs, setRawValuesInputs] = useState<string[]>(() =>
    initialOptions.map((o) => o.values.join(", ")),
  );
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);

  // Selection state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );

  // Bulk edit inputs
  const [bulkPriceInput, setBulkPriceInput] = useState<number | null>(null);
  const [bulkQtyInput, setBulkQtyInput] = useState<number | null>(null);

  // Regen-confirm dialog state
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const pendingRegen = useRef<{
    merged: FormVariant[];
    droppedCount: number;
  } | null>(null);

  useEffect(() => {
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < variants.length) next.add(i);
      }
      return next;
    });
  }, [variants.length]);

  const toggleSelect = (i: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIndices(
      selectedIndices.size === variants.length
        ? new Set()
        : new Set(variants.map((_, i) => i)),
    );
  };

  const bulkPriceError = bulkPriceIssue(bulkPriceInput);
  const bulkQtyError = bulkQtyIssue(bulkQtyInput);

  // The cents the bulk price would write, or null while it isn't applicable.
  const bulkPriceCents =
    bulkPriceInput !== null && bulkPriceError === null
      ? Math.round(bulkPriceInput * 100)
      : null;

  // `variantSchema` requires `compareAtPrice > price`, so bulk-setting a price
  // above a selected row's existing compare-at silently produces rows the
  // server rejects. Surface it live, before the click.
  const comparePriceConflicts = useMemo(
    () =>
      bulkPriceCents === null
        ? 0
        : countComparePriceConflicts(variants, selectedIndices, bulkPriceCents),
    [variants, selectedIndices, bulkPriceCents],
  );

  const applyBulkPrice = () => {
    const dollars = bulkPriceInput;
    // Backstop: the button is disabled for every one of these, but Enter and a
    // pasted or spinner-nudged value can still reach here.
    if (dollars === null || bulkPriceIssue(dollars) !== null) return;
    const cents = Math.round(dollars * 100);
    const conflicts = countComparePriceConflicts(
      variants,
      selectedIndices,
      cents,
    );
    onChange(
      variants.map((v, i) =>
        selectedIndices.has(i) ? { ...v, price: cents } : v,
      ),
    );
    setBulkPriceInput(null);
    // Warn rather than block: there is no bulk compare-at editor, so refusing
    // the whole operation would strand the owner with no way to raise prices
    // across a selection. The conflict is shown before the click, called out
    // again here, and each offending row is flagged inline below.
    if (conflicts > 0) {
      toast.warning(
        conflicts === 1
          ? `Price set to ${formatCurrency(cents)}. 1 variant now has a compare-at price at or below it — raise or clear that compare-at price before saving.`
          : `Price set to ${formatCurrency(cents)}. ${conflicts} variants now have a compare-at price at or below it — raise or clear those compare-at prices before saving.`,
      );
    }
  };

  const applyBulkQty = () => {
    const qty = bulkQtyInput;
    if (qty === null || bulkQtyIssue(qty) !== null) return;
    onChange(
      variants.map((v, i) =>
        selectedIndices.has(i) ? { ...v, inventoryQty: qty } : v,
      ),
    );
    setBulkQtyInput(null);
  };

  const deleteSelected = () => {
    onChange(variants.filter((_, i) => !selectedIndices.has(i)));
    setSelectedIndices(new Set());
  };

  const prevShowOptionsEditor = useRef(showOptionsEditor);
  useEffect(() => {
    const justOpened = showOptionsEditor && !prevShowOptionsEditor.current;
    prevShowOptionsEditor.current = showOptionsEditor;
    if (justOpened) {
      setRawValuesInputs(variantOptions.map((o) => o.values.join(", ")));
    }
  }, [showOptionsEditor, variantOptions]);

  // Generate all variant combinations from a validated set of active options.
  const generateVariantsFromActive = (
    activeOptions: Array<{ name: string; values: string[] }>,
  ): FormVariant[] => {
    if (activeOptions.length === 0) return [];

    const combinations: FormVariant[] = [];

    const generate = (
      currentOptions: Record<string, string>,
      optionIndex: number,
    ) => {
      if (optionIndex === activeOptions.length) {
        const name = activeOptions
          .map((opt) => currentOptions[opt.name] ?? "")
          .join(" / ");

        combinations.push({
          name,
          options: { ...currentOptions },
          inventoryQty: 0,
          price: basePrice > 0 ? basePrice : undefined,
        });
        return;
      }

      const option = activeOptions[optionIndex];
      if (!option) return;
      for (const value of option.values) {
        generate({ ...currentOptions, [option.name]: value }, optionIndex + 1);
      }
    };

    generate({}, 0);
    return combinations;
  };

  const handleGenerateVariants = () => {
    // 1. Separate options that have values but no name from truly active options.
    const optionsWithValues = variantOptions.filter(
      (opt) => opt.values.length > 0,
    );
    const unnamedWithValues = optionsWithValues.filter(
      (opt) => opt.name.trim() === "",
    );

    // 2. Reject unnamed value-bearing options.
    if (unnamedWithValues.length > 0) {
      toast.error("Every option with values needs a name.");
      return;
    }

    // Active = trimmed name AND at least one value.
    const activeOptions = variantOptions
      .filter((opt) => opt.name.trim() !== "" && opt.values.length > 0)
      .map((opt) => ({ name: opt.name.trim(), values: opt.values }));

    // 3. Require at least one active option.
    if (activeOptions.length === 0) {
      toast.error(
        "Add at least one option with a name and at least one value.",
      );
      return;
    }

    // 4. Cap combinations.
    const count = activeOptions.reduce(
      (acc, opt) => acc * opt.values.length,
      1,
    );
    if (count > MAX_VARIANTS) {
      toast.error(
        `That's ${count} combinations — the maximum is ${MAX_VARIANTS}. Reduce your options or values.`,
      );
      return;
    }

    const newVariants = generateVariantsFromActive(activeOptions);

    // Merge with existing variants (preserve custom prices, SKUs, etc.)
    const merged = newVariants.map((newVar) => {
      const existing = variants.find(
        (v) => JSON.stringify(v.options) === JSON.stringify(newVar.options),
      );
      return existing ?? newVar;
    });

    // 5. Warn before dropping existing variants.
    const newOptionsKeys = new Set(
      merged.map((v) => JSON.stringify(v.options)),
    );
    const droppedCount = variants.filter(
      (v) => !newOptionsKeys.has(JSON.stringify(v.options)),
    ).length;

    if (variants.length > 0 && droppedCount > 0) {
      pendingRegen.current = { merged, droppedCount };
      setShowRegenConfirm(true);
      return;
    }

    // Nothing dropped — apply immediately.
    onChange(merged);
    setShowOptionsEditor(false);
  };

  const confirmRegen = () => {
    if (pendingRegen.current) {
      onChange(pendingRegen.current.merged);
      pendingRegen.current = null;
    }
    setShowRegenConfirm(false);
    setShowOptionsEditor(false);
  };

  const cancelRegen = () => {
    pendingRegen.current = null;
    setShowRegenConfirm(false);
  };

  const updateVariant = <K extends keyof FormVariant>(
    index: number,
    field: K,
    value: FormVariant[K],
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index]!, [field]: value };
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  const addOption = () => {
    setVariantOptions((prev) => [
      ...prev,
      { name: "", values: [], key: nextOptionRowKey() },
    ]);
    setRawValuesInputs((prev) => [...prev, ""]);
  };

  const updateOptionName = (index: number, name: string) => {
    setVariantOptions((prev) =>
      prev.map((option, i) => (i === index ? { ...option, name } : option)),
    );
  };

  const updateOptionValues = (index: number, valuesStr: string) => {
    setRawValuesInputs((prev) => {
      const next = [...prev];
      next[index] = valuesStr;
      return next;
    });
    setVariantOptions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index]!,
        values: valuesStr
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };
      return updated;
    });
  };

  const removeOption = (index: number) => {
    setVariantOptions(variantOptions.filter((_, i) => i !== index));
    setRawValuesInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const allSelected =
    variants.length > 0 && selectedIndices.size === variants.length;
  const someSelected = selectedIndices.size > 0 && !allSelected;

  const variantRowKeys = useMemo(
    () => buildVariantRowKeys(variants),
    [variants],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Variants</CardTitle>
            <CardDescription>
              Add variants like sizes, colors, or styles
            </CardDescription>
          </div>
          {!showOptionsEditor && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowOptionsEditor(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {variants.length > 0 ? "Edit Options" : "Add Variants"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Options Editor */}
        {showOptionsEditor && (
          <div className="bg-muted space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Variant Options</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOptionsEditor(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {variantOptions.map((option, index) => (
              <div key={option.key} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Option name (e.g., Size, Color)"
                    aria-label={`Option ${index + 1} name`}
                    value={option.name}
                    onChange={(e) => updateOptionName(index, e.target.value)}
                    className="flex-1"
                  />
                  {variantOptions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Values (comma separated, e.g., Small, Medium, Large)"
                  aria-label={`Option ${index + 1} values (comma separated)`}
                  value={rawValuesInputs[index] ?? option.values.join(", ")}
                  onChange={(e) => updateOptionValues(index, e.target.value)}
                />
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
              <Button type="button" size="sm" onClick={handleGenerateVariants}>
                Generate Variants
              </Button>
            </div>
          </div>
        )}

        {/* Variants List */}
        {variants.length > 0 && (
          <div className="space-y-3">
            {/* List header with select-all + count */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all-variants"
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={toggleSelectAll}
                aria-label="Select all variants"
              />
              <p className="text-muted-foreground text-sm">
                {selectedIndices.size > 0
                  ? `${selectedIndices.size} of ${variants.length} selected`
                  : `${variants.length} variant${variants.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {!(basePrice > 0) && (
              <p className="text-muted-foreground text-sm">
                Set a base price in Pricing, or enter a price for each variant
                below.
              </p>
            )}

            {/* Bulk actions toolbar */}
            {selectedIndices.size > 0 && (
              <div className="bg-muted/50 space-y-2 rounded-lg border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-sm font-medium">
                    Bulk edit:
                  </span>

                  <div className="flex items-center gap-1">
                    <MoneyInput
                      size="sm"
                      placeholder="Price"
                      aria-label="Bulk price for selected variants"
                      aria-invalid={bulkPriceError !== null}
                      aria-describedby={
                        bulkPriceError ? "bulk-price-error" : undefined
                      }
                      value={bulkPriceInput}
                      onChange={(e) => setBulkPriceInput(e)}
                      className="w-28"
                      onKeyDown={(e) => e.key === "Enter" && applyBulkPrice()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      onClick={applyBulkPrice}
                      disabled={
                        bulkPriceInput === null || bulkPriceError !== null
                      }
                    >
                      Set Price
                    </Button>
                  </div>

                  {trackInventory && (
                    <div className="flex items-center gap-1">
                      <NumberInput
                        step="1"
                        min="0"
                        placeholder="Qty"
                        aria-label="Bulk stock quantity for selected variants"
                        aria-invalid={bulkQtyError !== null}
                        aria-describedby={
                          bulkQtyError ? "bulk-qty-error" : undefined
                        }
                        value={bulkQtyInput}
                        onChange={(e) => setBulkQtyInput(e)}
                        className="h-8 w-20"
                        onKeyDown={(e) => e.key === "Enter" && applyBulkQty()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        // variant="outline"
                        className="h-8"
                        onClick={applyBulkQty}
                        disabled={
                          bulkQtyInput === null || bulkQtyError !== null
                        }
                      >
                        Set Qty
                      </Button>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="ml-auto h-8"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete selected
                  </Button>
                </div>

                {bulkPriceError !== null && (
                  <p id="bulk-price-error" className="text-destructive text-xs">
                    {bulkPriceError}
                  </p>
                )}
                {bulkQtyError !== null && (
                  <p id="bulk-qty-error" className="text-destructive text-xs">
                    {bulkQtyError}
                  </p>
                )}
                {comparePriceConflicts > 0 && bulkPriceCents !== null && (
                  <p className={cn("text-xs", WARNING_TEXT)}>
                    {comparePriceConflicts === 1
                      ? `1 selected variant has a compare-at price at or below ${formatCurrency(bulkPriceCents)}. Setting this price will leave that row needing a higher compare-at price, or none at all, before you can save.`
                      : `${comparePriceConflicts} selected variants have a compare-at price at or below ${formatCurrency(bulkPriceCents)}. Setting this price will leave those rows needing a higher compare-at price, or none at all, before you can save.`}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {variants.map((variant, index) => {
                // A $0 price is caught here rather than by `variantSchema`
                // (which allows 0) because the storefront reads 0 as "inherit
                // the base price"; the parent's schema errors land alongside it.
                const rowMessages = [
                  variant.price === 0
                    ? `${variant.name}: Price must be more than $0.`
                    : null,
                  variant.compareAtPrice === 0
                    ? `${variant.name}: Compare-at price must be more than $0, or left blank.`
                    : null,
                  errors?.[index] ?? null,
                ].filter((m): m is string => m !== null);

                return (
                  <div
                    key={variantRowKeys[index] ?? index}
                    className={cn(
                      "bg-card space-y-2 rounded-lg border p-3",
                      rowMessages.length > 0 &&
                        "border-destructive bg-destructive/5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIndices.has(index)}
                        onCheckedChange={() => toggleSelect(index)}
                        aria-label={`Select variant ${variant.name}`}
                      />

                      {/* Variant image picker */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Set image for ${variant.name}`}
                            disabled={images.length === 0}
                            title={
                              images.length === 0
                                ? "Add product images first"
                                : variant.imageUrl
                                  ? "Change variant image"
                                  : "Assign a gallery image"
                            }
                            className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {variant.imageUrl ? (
                              <AdminThumb
                                src={variant.imageUrl}
                                alt={`Image for ${variant.name}`}
                                loading="lazy"
                                className="h-12 w-12 rounded object-cover"
                              />
                            ) : (
                              <ImageIcon className="text-muted-foreground h-5 w-5" />
                            )}
                          </button>
                        </PopoverTrigger>
                        {images.length > 0 && (
                          <PopoverContent className="w-56 p-2" align="start">
                            <p className="text-muted-foreground mb-2 text-xs font-medium">
                              Pick a gallery image
                            </p>
                            <div className="grid grid-cols-4 gap-1">
                              {/* "None" option */}
                              <button
                                type="button"
                                aria-label="Remove variant image"
                                onClick={() =>
                                  updateVariant(index, "imageUrl", null)
                                }
                                className={cn(
                                  "text-muted-foreground hover:border-border flex h-10 w-10 items-center justify-center rounded border text-xs",
                                  !variant.imageUrl
                                    ? "border-blue-500 ring-1 ring-blue-500"
                                    : "border-border",
                                )}
                              >
                                None
                              </button>
                              {images.map((img) => (
                                <button
                                  key={img.url}
                                  type="button"
                                  aria-label={img.altText ?? img.url}
                                  onClick={() =>
                                    updateVariant(index, "imageUrl", img.url)
                                  }
                                  className={cn(
                                    "hover:border-border overflow-hidden rounded border",
                                    variant.imageUrl === img.url
                                      ? "border-blue-500 ring-1 ring-blue-500"
                                      : "border-border",
                                  )}
                                >
                                  <AdminThumb
                                    src={img.url}
                                    alt={img.altText ?? ""}
                                    className="h-10 w-10 object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>

                      {/* <GripVertical className="h-4 w-4 shrink-0 text-gray-400" /> */}

                      <div className="grid flex-1 grid-cols-1 items-start gap-3 md:grid-cols-5">
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Name
                          </Label>
                          <p className="flex h-8 items-center text-sm font-medium">
                            {variant.name}
                          </p>
                        </div>

                        <div>
                          <Label
                            htmlFor={`sku-${index}`}
                            className="text-muted-foreground text-xs"
                          >
                            SKU
                          </Label>
                          <Input
                            id={`sku-${index}`}
                            type="text"
                            value={variant.sku ?? ""}
                            onChange={(e) =>
                              updateVariant(index, "sku", e.target.value)
                            }
                            placeholder="Optional"
                            className="h-8"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor={`price-${index}`}
                            className="text-muted-foreground text-xs"
                          >
                            Price
                          </Label>
                          <MoneyInput
                            id={`price-${index}`}
                            size="sm"
                            value={
                              variant.price !== undefined
                                ? variant.price / 100
                                : null
                            }
                            onChange={(e) =>
                              updateVariant(
                                index,
                                "price",
                                e === null ? undefined : Math.round(e * 100),
                              )
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor={`compare-at-price-${index}`}
                            className="text-muted-foreground text-xs"
                          >
                            Compare At
                          </Label>
                          <MoneyInput
                            id={`compare-at-price-${index}`}
                            size="sm"
                            value={
                              variant.compareAtPrice !== undefined
                                ? variant.compareAtPrice / 100
                                : null
                            }
                            onChange={(e) =>
                              updateVariant(
                                index,
                                "compareAtPrice",
                                e === null ? undefined : Math.round(e * 100),
                              )
                            }
                            placeholder="Optional"
                          />
                        </div>

                        {trackInventory && (
                          <div>
                            <Label
                              htmlFor={`qty-${index}`}
                              className="text-muted-foreground text-xs"
                            >
                              Stock
                            </Label>
                            <NumberInput
                              id={`qty-${index}`}
                              step="1"
                              min="0"
                              value={variant.inventoryQty}
                              onChange={(e) =>
                                updateVariant(index, "inventoryQty", e ?? 0)
                              }
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {rowMessages.length > 0 && (
                      <p className="text-destructive text-xs">
                        {rowMessages.join(" ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {variants.length === 0 && !showOptionsEditor && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No variants added. This product has a single variant.
          </p>
        )}
      </CardContent>

      {/* Confirm dialog — shown when regenerating would drop existing variants */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove existing variants?</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating will remove {pendingRegen.current?.droppedCount ?? 0}{" "}
              variant
              {(pendingRegen.current?.droppedCount ?? 0) !== 1 ? "s" : ""} that
              no longer match these options. Any custom prices, SKUs, or stock
              values on those variants will be lost. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRegen}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegen}>
              Yes, regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
