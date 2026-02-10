"use client";

import { useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type VariantOption = {
  name: string;
  values: string[];
};

type Variant = {
  id?: string;
  name: string;
  sku?: string;
  price?: number; // in cents
  inventoryQty: number;
  options: Record<string, string>; // { size: "Small", color: "Red" }
};

type Props = {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  basePrice: number; // in cents
  existingVariantOptions: VariantOption[];
};

export function VariantManager({
  variants,
  onChange,
  basePrice,
  existingVariantOptions,
}: Props) {
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>(
    existingVariantOptions ?? [{ name: "Size", values: [] }],
  );
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);

  // Generate all variant combinations from options
  const generateVariants = () => {
    if (variantOptions.every((opt) => opt.values.length === 0)) {
      return [];
    }

    // Get options that have values
    const activeOptions = variantOptions.filter((opt) => opt.values.length > 0);

    if (activeOptions.length === 0) return [];

    // Generate all combinations
    const combinations: Variant[] = [];

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

  const updateVariant = <K extends keyof Variant>(
    index: number,
    field: K,
    value: Variant[K],
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
  };

  const updateOptionName = (index: number, name: string) => {
    const updated = [...variantOptions];
    updated[index]!.name = name;
    setVariantOptions(updated);
  };

  const updateOptionValues = (index: number, valuesStr: string) => {
    const updated = [...variantOptions];
    updated[index]!.values = valuesStr
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    setVariantOptions(updated);
  };

  const removeOption = (index: number) => {
    setVariantOptions(variantOptions.filter((_, i) => i !== index));
  };

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
                  value={option.values.join(",")}
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {variants.length} variant{variants.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border bg-white p-3"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />

                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
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
