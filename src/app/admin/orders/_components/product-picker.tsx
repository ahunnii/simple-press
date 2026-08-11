"use client";

import type { Image as ProductImage, Product, ProductVariant } from "generated/prisma";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronsUpDown, Package } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export type PickableProduct = Product & {
  variants: ProductVariant[];
  images: ProductImage[];
};

/**
 * Searchable product picker for the manual order form.
 *
 * Built on Popover + Command rather than `~/components/ui/combobox` (Base UI):
 * these rows are multi-line — thumbnail, name, price, SKU, stock — and cmdk
 * gives us the filtering and keyboard handling for free. `phone-form-field.tsx`
 * is the same pattern.
 *
 * The whole catalog is already in memory: `/admin/orders/new` prefetches it
 * server-side via `product.secureGetAll` and passes it down as a prop, so the
 * search here is a local filter, not a query.
 */
export function ProductPicker({
  products,
  value,
  onSelect,
  disabled,
  invalid,
}: {
  products: PickableProduct[];
  value: string | undefined;
  onSelect: (product: PickableProduct) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === value),
    [products, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {selected ? selected.name : "Search products…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
        align="start"
      >
        <Command
          // Match on the composite string built below rather than cmdk's
          // default (the rendered text), so a SKU or variant name finds the
          // product even though neither is the row's title.
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase().trim())
              ? 1
              : 0
          }
        >
          <CommandInput placeholder="Search by name, SKU, or variant…" />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  isSelected={product.id === value}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProductRow({
  product,
  isSelected,
  onSelect,
}: {
  product: PickableProduct;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const thumbnail = [...product.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];

  // The id is included so two identically-named products stay distinct — cmdk
  // dedupes items by value.
  const searchValue = [
    product.name,
    product.sku ?? "",
    ...product.variants.map((v) => `${v.name} ${v.sku ?? ""}`),
    product.id,
  ].join(" ");

  return (
    <CommandItem value={searchValue} onSelect={onSelect} className="gap-3">
      {thumbnail ? (
        <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded">
          <Image src={thumbnail.url} alt="" fill sizes="36px" className="object-cover" />
        </div>
      ) : (
        <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded">
          <Package aria-hidden="true" className="text-muted-foreground h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {formatPrice(product.price)}
          {product.sku ? ` · ${product.sku}` : ""}
          {!product.published ? " · Draft" : ""}
        </p>
      </div>

      <StockLabel product={product} />

      <Check
        className={cn(
          "ml-1 h-4 w-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0",
        )}
      />
    </CommandItem>
  );
}

/**
 * Stock is deliberately quiet for the two cases where a single number would be
 * a lie: products with variants (stock is per-variant, shown on the variant
 * select) and pool-backed products (stock lives on the shared pool).
 */
function StockLabel({ product }: { product: PickableProduct }) {
  if (product.variants.length > 0) {
    return (
      <span className="text-muted-foreground shrink-0 text-xs">
        {product.variants.length} variants
      </span>
    );
  }

  if (product.baseInventoryUnitId) {
    return <span className="text-muted-foreground shrink-0 text-xs">Pooled</span>;
  }

  if (!product.trackInventory) return null;

  const out = product.inventoryQty <= 0;
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        out ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {out ? "Out of stock" : `${product.inventoryQty} in stock`}
    </span>
  );
}
