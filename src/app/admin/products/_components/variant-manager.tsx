"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type {
  FormProductImage,
  FormVariant,
  FormVariantOption,
} from "../_validators/schema";
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
import { NumberInput } from "~/components/ui/number-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

const MAX_VARIANTS = 100;

type Props = {
  variants: FormVariant[];
  onChange: (variants: FormVariant[]) => void;
  /** When false, per-variant stock fields are hidden (unlimited stock). */
  trackInventory?: boolean;
  basePrice: number; // in cents
  existingVariantOptions: FormVariantOption[];
  images: FormProductImage[];
};

export function VariantManager({
  variants,
  onChange,
  trackInventory = false,
  basePrice,
  existingVariantOptions,
  images,
}: Props) {
  const initialOptions = existingVariantOptions ?? [
    { name: "Size", values: [] },
  ];
  const [variantOptions, setVariantOptions] =
    useState<FormVariantOption[]>(initialOptions);
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

  // Reset selection when the number of variants changes
  useEffect(() => {
    setSelectedIndices(new Set());
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

  const applyBulkPrice = () => {
    const dollars = bulkPriceInput;
    if (dollars === null || isNaN(dollars) || dollars < 0) return;
    const cents = Math.round(dollars * 100);
    onChange(
      variants.map((v, i) =>
        selectedIndices.has(i) ? { ...v, price: cents } : v,
      ),
    );
    setBulkPriceInput(null);
  };

  const applyBulkQty = () => {
    const qty = bulkQtyInput;
    if (qty === null || isNaN(qty) || qty < 0) return;
    onChange(
      variants.map((v, i) =>
        selectedIndices.has(i) ? { ...v, inventoryQty: qty } : v,
      ),
    );
    setBulkQtyInput(null);
  };

  const deleteSelected = () => {
    onChange(variants.filter((_, i) => !selectedIndices.has(i)));
    // selectedIndices reset handled by the variants.length useEffect
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
          price: basePrice,
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
  };

  const addOption = () => {
    setVariantOptions([...variantOptions, { name: "", values: [] }]);
    setRawValuesInputs((prev) => [...prev, ""]);
  };

  const updateOptionName = (index: number, name: string) => {
    const updated = [...variantOptions];
    updated[index]!.name = name;
    setVariantOptions(updated);
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
          <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
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
              <div key={index} className="space-y-2">
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
              <p className="text-sm text-gray-600">
                {selectedIndices.size > 0
                  ? `${selectedIndices.size} of ${variants.length} selected`
                  : `${variants.length} variant${variants.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Bulk actions toolbar */}
            {selectedIndices.size > 0 && (
              <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Bulk edit:
                </span>

                <div className="flex items-center gap-1">
                  <NumberInput
                    step="0.01"
                    min="0"
                    placeholder="Price ($)"
                    value={bulkPriceInput}
                    onChange={(e) => setBulkPriceInput(e)}
                    className="h-8 w-28"
                    onKeyDown={(e) => e.key === "Enter" && applyBulkPrice()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={applyBulkPrice}
                    disabled={bulkPriceInput === null}
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
                      disabled={bulkQtyInput === null}
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
            )}

            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border bg-white p-3"
                >
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
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {variant.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={variant.imageUrl}
                            alt={`Image for ${variant.name}`}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </PopoverTrigger>
                    {images.length > 0 && (
                      <PopoverContent className="w-56 p-2" align="start">
                        <p className="mb-2 text-xs font-medium text-gray-500">
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
                            className={`flex h-10 w-10 items-center justify-center rounded border text-xs text-gray-400 hover:border-gray-400 ${
                              !variant.imageUrl
                                ? "border-blue-500 ring-1 ring-blue-500"
                                : "border-gray-200"
                            }`}
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
                              className={`overflow-hidden rounded border hover:border-gray-400 ${
                                variant.imageUrl === img.url
                                  ? "border-blue-500 ring-1 ring-blue-500"
                                  : "border-gray-200"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
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

                  <div className="grid flex-1 grid-cols-1 items-center gap-3 md:grid-cols-5">
                    <div>
                      <Label className="text-xs text-gray-500">Name</Label>
                      <p className="text-sm font-medium">{variant.name}</p>
                    </div>

                    <div>
                      <Label
                        htmlFor={`sku-${index}`}
                        className="text-xs text-gray-500"
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
                        className="text-xs text-gray-500"
                      >
                        Price ($)
                      </Label>
                      <NumberInput
                        id={`price-${index}`}
                        step="0.01"
                        value={variant.price ? variant.price / 100 : 0}
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "price",
                            e ? Math.round(e * 100) : undefined,
                          )
                        }
                        placeholder={(basePrice / 100).toFixed(2)}
                        className="h-8"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`compare-at-price-${index}`}
                        className="text-xs text-gray-500"
                      >
                        Compare At ($)
                      </Label>
                      <NumberInput
                        id={`compare-at-price-${index}`}
                        step="0.01"
                        value={
                          variant.compareAtPrice
                            ? variant.compareAtPrice / 100
                            : 0
                        }
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "compareAtPrice",
                            e ? Math.round(e * 100) : undefined,
                          )
                        }
                        placeholder="Optional"
                        className="h-8"
                      />
                    </div>

                    {trackInventory && (
                      <div>
                        <Label
                          htmlFor={`qty-${index}`}
                          className="text-xs text-gray-500"
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
              ))}
            </div>
          </div>
        )}

        {variants.length === 0 && !showOptionsEditor && (
          <p className="py-4 text-center text-sm text-gray-500">
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
