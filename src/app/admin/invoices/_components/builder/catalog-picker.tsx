"use client";

import { useEffect, useState } from "react";
import { Layers, Package, Search } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
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

export type CatalogPickResult = {
  description: string;
  unitPriceCents: number;
  productId?: string;
  variantId?: string;
  serviceItemId?: string;
  /** The picked service had no parseable price — the caller should focus the new row's price field. */
  focusPrice?: boolean;
};

/**
 * "Add from catalog" — searches `api.invoice.catalogOptions` (products,
 * variants and service items) and hands the picked row's description/price
 * back to the line-items editor to append as a new line.
 *
 * Modeled on `CustomerPicker` (Popover + Command, debounced live query)
 * rather than `ProductPicker` (a prefetched-prop local filter): the
 * `catalogOptions` shape (variants nested under products, plus services) is
 * unique to invoices, and there's no whole-catalog prop already sitting on
 * this page to filter locally.
 */
export function CatalogPicker({
  onPick,
  disabled,
}: {
  onPick: (result: CatalogPickResult) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const { data, isFetching } = api.invoice.catalogOptions.useQuery(
    { search: debouncedQuery || undefined },
    { enabled: open, staleTime: 15_000 },
  );

  const products = data?.products ?? [];
  const services = data?.services ?? [];
  const plainProducts = products.filter((p) => p.variants.length === 0);
  const variantProducts = products.filter((p) => p.variants.length > 0);
  const hasResults =
    plainProducts.length > 0 ||
    variantProducts.length > 0 ||
    services.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Add from catalog
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0" align="start">
        {/* Results are already filtered server-side (`catalogOptions`); cmdk's
            own fuzzy pass on top would hide valid matches — same reasoning as
            `CustomerPicker`. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search products or services…"
          />
          <CommandList>
            <CommandEmpty>
              {isFetching
                ? "Searching…"
                : hasResults
                  ? "No matches."
                  : "No catalog items found."}
            </CommandEmpty>

            {plainProducts.length > 0 && (
              <CommandGroup heading="Products">
                {plainProducts.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    className="gap-3"
                    onSelect={() => {
                      onPick({
                        description: product.name,
                        unitPriceCents: product.priceCents,
                        productId: product.id,
                      });
                      setOpen(false);
                    }}
                  >
                    <Package
                      className="text-muted-foreground h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {product.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatPrice(product.priceCents)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {variantProducts.map((product) => (
              <CommandGroup key={product.id} heading={product.name}>
                {product.variants.map((variant) => (
                  <CommandItem
                    key={variant.id}
                    value={`${product.id}-${variant.id}`}
                    className="gap-3"
                    onSelect={() => {
                      onPick({
                        description: `${product.name} — ${variant.name}`,
                        unitPriceCents: variant.priceCents,
                        productId: product.id,
                        variantId: variant.id,
                      });
                      setOpen(false);
                    }}
                  >
                    <Package
                      className="text-muted-foreground h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {variant.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatPrice(variant.priceCents)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {services.length > 0 && (
              <CommandGroup heading="Services">
                {services.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    className="gap-3"
                    onSelect={() => {
                      onPick({
                        description: item.name,
                        unitPriceCents: item.priceCents ?? 0,
                        serviceItemId: item.id,
                        focusPrice: item.priceCents === null,
                      });
                      setOpen(false);
                    }}
                  >
                    <Layers
                      className="text-muted-foreground h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {item.priceCents === null
                        ? "Set price"
                        : formatPrice(item.priceCents)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
