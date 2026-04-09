"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import type { FormVariant, FormVariantOption } from "../_validators/schema";
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

type Props = {
  variants: FormVariant[];
  onChange: (variants: FormVariant[]) => void;
  /** When false, per-variant stock fields are hidden (unlimited stock). */
  trackInventory?: boolean;
  basePrice: number; // in cents
  existingVariantOptions: FormVariantOption[];
};

export function VariantManager({
  variants,
  onChange,
  trackInventory = false,
  basePrice,
  existingVariantOptions,
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
  const [bulkPriceInput, setBulkPriceInput] = useState("");
  const [bulkQtyInput, setBulkQtyInput] = useState("");

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
    const dollars = parseFloat(bulkPriceInput);
    if (isNaN(dollars) || dollars < 0) return;
    const cents = Math.round(dollars * 100);
    onChange(
      variants.map((v, i) =>
        selectedIndices.has(i) ? { ...v, price: cents } : v,
      ),
    );
    setBulkPriceInput("");
  };

  const applyBulkQty = () => {
    const qty = parseInt(bulkQtyInput);
    if (isNaN(qty) || qty < 0) return;
    onChange(
      variants.map((v, i) =>
        selectedIndices.has(i) ? { ...v, inventoryQty: qty } : v,
      ),
    );
    setBulkQtyInput("");
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

  // Generate all variant combinations from options
  const generateVariants = () => {
    if (variantOptions.every((opt) => opt.values.length === 0)) {
      return [];
    }

    // Get options that have values
    const activeOptions = variantOptions.filter((opt) => opt.values.length > 0);

    if (activeOptions.length === 0) return [];

    // Generate all combinations
    const combinations: FormVariant[] = [];

    const generate = (
      currentOptions: Record<string, string>,
      optionIndex: number,
    ) => {
      if (optionIndex === activeOptions.length) {
        const name = activeOptions
          .map((opt) => currentOptions[opt.name])
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
      for (const value of option?.values ?? []) {
        generate(
          { ...currentOptions, [option?.name ?? ""]: value },
          optionIndex + 1,
        );
      }
    };

    generate({}, 0);
    return combinations;
  };

  const handleGenerateVariants = () => {
    const newVariants = generateVariants();

    // Merge with existing variants (preserve custom prices, SKUs, etc.)
    const merged = newVariants.map((newVar) => {
      const existing = variants.find(
        (v) => JSON.stringify(v.options) === JSON.stringify(newVar.options),
      );
      return existing ?? newVar;
    });

    onChange(merged);
    setShowOptionsEditor(false);
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
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price ($)"
                    value={bulkPriceInput}
                    onChange={(e) => setBulkPriceInput(e.target.value)}
                    className="h-8 w-28"
                    onKeyDown={(e) => e.key === "Enter" && applyBulkPrice()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    // variant="secondary"
                    className="h-8"
                    onClick={applyBulkPrice}
                    disabled={bulkPriceInput === ""}
                  >
                    Set Price
                  </Button>
                </div>

                {trackInventory && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={bulkQtyInput}
                      onChange={(e) => setBulkQtyInput(e.target.value)}
                      className="h-8 w-20"
                      onKeyDown={(e) => e.key === "Enter" && applyBulkQty()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      // variant="outline"
                      className="h-8"
                      onClick={applyBulkQty}
                      disabled={bulkQtyInput === ""}
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
                      <Input
                        id={`price-${index}`}
                        type="number"
                        step="0.01"
                        value={
                          variant.price ? (variant.price / 100).toFixed(2) : ""
                        }
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "price",
                            e.target.value
                              ? Math.round(parseFloat(e.target.value) * 100)
                              : undefined,
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
                      <Input
                        id={`compare-at-price-${index}`}
                        type="number"
                        step="0.01"
                        value={
                          variant.compareAtPrice
                            ? (variant.compareAtPrice / 100).toFixed(2)
                            : ""
                        }
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "compareAtPrice",
                            e.target.value
                              ? Math.round(parseFloat(e.target.value) * 100)
                              : undefined,
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
                        <Input
                          id={`qty-${index}`}
                          type="number"
                          min="0"
                          value={variant.inventoryQty}
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "inventoryQty",
                              parseInt(e.target.value) || 0,
                            )
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
    </Card>
  );
}
