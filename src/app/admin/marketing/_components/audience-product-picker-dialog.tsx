"use client";

import { useMemo, useState } from "react";
import { Check, ImageOff, Loader2, Search, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

export const AUDIENCE_PRODUCTS_MAX = 20;
const SEARCH_LIMIT = 25;

export type AudienceProduct = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Products already chosen; preselected, in order. */
  initial: readonly AudienceProduct[];
  onConfirm: (products: AudienceProduct[]) => void;
};

function Thumb({ url, className }: { url: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center overflow-hidden rounded",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- product photos come from any configured store host
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <ImageOff className="size-4" aria-hidden />
      )}
    </span>
  );
}

/**
 * Pick up to 20 products for the "Bought specific products" audience. Same
 * search-and-toggle pattern as the email product block's picker, but not
 * limited to published products: someone may have bought a product the store
 * no longer lists.
 */
export function AudienceProductPickerDialog({
  open,
  onOpenChange,
  initial,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted only while open so each opening starts from the current
            selection and an empty search. */}
        {open && (
          <PickerBody
            initial={initial}
            onCancel={() => onOpenChange(false)}
            onConfirm={(products) => {
              onConfirm(products);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  initial,
  onCancel,
  onConfirm,
}: {
  initial: readonly AudienceProduct[];
  onCancel: () => void;
  onConfirm: (products: AudienceProduct[]) => void;
}) {
  const [selected, setSelected] = useState<AudienceProduct[]>(() => [
    ...initial,
  ]);
  const [query, setQuery] = useState("");
  const searchTerm = useDebouncedValue(query, 250).trim();

  const search = api.product.searchForPicker.useQuery(
    { query: searchTerm, limit: SEARCH_LIMIT, publishedOnly: false },
    { placeholderData: (prev) => prev },
  );

  const results = useMemo(
    () =>
      (search.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.images[0]?.url ?? null,
        published: p.published,
      })),
    [search.data],
  );
  const isSearching = search.isFetching || query.trim() !== searchTerm;
  const selectedIds = new Set(selected.map((p) => p.id));
  const isFull = selected.length >= AUDIENCE_PRODUCTS_MAX;

  const toggle = (product: AudienceProduct) =>
    setSelected((current) => {
      if (current.some((p) => p.id === product.id)) {
        return current.filter((p) => p.id !== product.id);
      }
      if (current.length >= AUDIENCE_PRODUCTS_MAX) return current;
      return [...current, { id: product.id, name: product.name }];
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose products</DialogTitle>
        <DialogDescription>
          Email people who bought any of up to {AUDIENCE_PRODUCTS_MAX} products.
          Only paid orders count.
        </DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search products"
          placeholder="Search products…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className="pl-10"
          autoFocus
        />
      </div>

      <div
        aria-live="polite"
        aria-busy={isSearching}
        className="-mx-1 max-h-72 space-y-1 overflow-y-auto px-1"
      >
        {search.isError ? (
          <p className="text-destructive py-6 text-center text-sm">
            Couldn&apos;t load your products. Try again in a moment.
          </p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {isSearching || search.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading products…
              </span>
            ) : searchTerm ? (
              <>No products match &ldquo;{searchTerm}&rdquo;</>
            ) : (
              "You don't have any products yet."
            )}
          </p>
        ) : (
          <>
            {results.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={!isSelected && isFull}
                  onClick={() => toggle(item)}
                  className={cn(
                    "focus-visible:ring-ring hover:bg-muted/50 flex w-full items-center gap-3 rounded-md border p-2 text-left focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    isSelected && "border-primary bg-primary/5",
                  )}
                >
                  <Thumb url={item.imageUrl} className="size-10" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    {!item.published && (
                      <span className="text-muted-foreground text-xs">
                        Not published
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {isSelected && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })}
            {results.length >= SEARCH_LIMIT && (
              <p className="text-muted-foreground px-1 py-1 text-xs">
                Showing the first {SEARCH_LIMIT}. Search to find others.
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium">
          {selected.length} of {AUDIENCE_PRODUCTS_MAX} chosen
        </p>
        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selected.map((p) => (
              <li
                key={p.id}
                className="bg-muted/60 flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2.5 text-xs"
              >
                <span className="max-w-40 truncate">{p.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() =>
                    setSelected((c) => c.filter((x) => x.id !== p.id))
                  }
                  className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring flex size-5 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
        >
          Use {selected.length > 0 ? selected.length : ""}{" "}
          {selected.length === 1 ? "product" : "products"}
        </Button>
      </DialogFooter>
    </>
  );
}
