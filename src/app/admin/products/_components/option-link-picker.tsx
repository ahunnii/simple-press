"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import type { LinkedTarget } from "./option-editor-types";
import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

type Props = {
  /** Names the trigger for screen readers, e.g. `Choice 2`. */
  accessibleName: string;
  hasLink: boolean;
  onPick: (target: LinkedTarget) => void;
};

/**
 * "Use a product" search. Variant products list each variant as its own row
 * so the owner picks the exact stocked item in one step; a product with no
 * variants is a single row. Drafts (unpublished products) are included and
 * labelled — an unpublished product is a valid way to track a charm's stock
 * without listing it in the shop.
 */
export function OptionLinkPicker({ accessibleName, hasLink, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250).trim();

  const results = api.productOption.searchLinkTargets.useQuery(
    { query: debounced },
    { enabled: open, placeholderData: (previous) => previous },
  );
  const isSearching = results.isFetching || query.trim() !== debounced;

  const pick = (target: LinkedTarget) => {
    onPick(target);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Search className="mr-2 h-4 w-4" aria-hidden="true" />
          {hasLink ? "Change product" : "Choose a product"}
          <span className="sr-only"> for {accessibleName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(26rem,90vw)] space-y-2 p-3"
      >
        <Input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your products"
          aria-label="Search your products"
        />
        <div
          className="max-h-64 space-y-1 overflow-y-auto"
          aria-busy={isSearching}
        >
          {results.isError ? (
            <p className="text-destructive px-1 py-2 text-sm">
              Couldn&apos;t load products. Try again.
            </p>
          ) : (results.data ?? []).length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">
              {isSearching ? "Searching…" : "No products found."}
            </p>
          ) : (
            (results.data ?? []).map((product) => {
              const variantTargets = product.variants.map(
                (variant): [string, LinkedTarget, number] => [
                  `${product.name} — ${variant.name}`,
                  {
                    productId: product.id,
                    productName: product.name,
                    published: product.published,
                    productPriceCents: product.priceCents,
                    variants: product.variants,
                    variantId: variant.id,
                  },
                  variant.priceCents,
                ],
              );
              const rows: [string, LinkedTarget, number][] =
                variantTargets.length > 0
                  ? variantTargets
                  : [
                      [
                        product.name,
                        {
                          productId: product.id,
                          productName: product.name,
                          published: product.published,
                          productPriceCents: product.priceCents,
                          variants: [],
                          variantId: null,
                        },
                        product.priceCents,
                      ],
                    ];
              return rows.map(([label, target, priceCents]) => (
                <button
                  key={`${product.id}:${target.variantId ?? ""}`}
                  type="button"
                  onClick={() => pick(target)}
                  className="hover:bg-muted focus-visible:ring-ring flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="min-w-0 truncate">
                    {label}
                    {!product.published && (
                      <Badge variant="secondary" className="ml-2">
                        Draft
                      </Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {formatPrice(priceCents)}
                  </span>
                </button>
              ));
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
