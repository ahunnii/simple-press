"use client";

import * as React from "react";
import { Check, ImageOff, Loader2, Search, X } from "lucide-react";

import type { EmailProductItem } from "~/lib/tiptap/email-products-node";
import { productToEmailItem } from "~/lib/marketing/product-to-email-item";
import { formatPrice } from "~/lib/prices";
import { EMAIL_PRODUCTS_MAX } from "~/lib/tiptap/email-products-node";
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

const SEARCH_LIMIT = 25;

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Products already in the block (change mode); preselected, in order. */
  initialItems?: readonly EmailProductItem[];
  /** Called with 1–4 snapshot items when the owner confirms. */
  onConfirm: (items: EmailProductItem[]) => void;
}

/** Decorative: the product's name always sits beside it. */
function ProductThumb({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
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

function PriceLabel({ item }: { item: EmailProductItem }) {
  return (
    <span className="text-muted-foreground text-xs">
      {formatPrice(item.priceCents)}
      {item.compareAtCents !== null && (
        <s className="ml-1.5 opacity-70">{formatPrice(item.compareAtCents)}</s>
      )}
    </span>
  );
}

/**
 * Pick up to four published products for an email's product block. Lists
 * the store's products (first 25 by name) and narrows as the owner types;
 * the chosen ones are snapshotted (`productToEmailItem`) on confirm.
 */
export function ProductPickerDialog({
  open,
  onOpenChange,
  initialItems,
  onConfirm,
}: ProductPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted only while open, so each opening starts from the block's
            current products and an empty search. */}
        {open && (
          <ProductPickerBody
            initialItems={initialItems}
            onCancel={() => onOpenChange(false)}
            onConfirm={(items) => {
              onConfirm(items);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductPickerBody({
  initialItems,
  onCancel,
  onConfirm,
}: {
  initialItems?: readonly EmailProductItem[];
  onCancel: () => void;
  onConfirm: (items: EmailProductItem[]) => void;
}) {
  const isChange = (initialItems?.length ?? 0) > 0;
  const [selected, setSelected] = React.useState<EmailProductItem[]>(() => [
    ...(initialItems ?? []),
  ]);
  const [query, setQuery] = React.useState("");
  const searchTerm = useDebouncedValue(query, 250).trim();

  const search = api.product.searchForPicker.useQuery(
    { query: searchTerm, limit: SEARCH_LIMIT, publishedOnly: true },
    { placeholderData: (prev) => prev },
  );

  const results = React.useMemo(
    () => (search.data ?? []).map(productToEmailItem),
    [search.data],
  );
  const isSearching = search.isFetching || query.trim() !== searchTerm;
  const selectedIds = new Set(selected.map((item) => item.productId));
  const isFull = selected.length >= EMAIL_PRODUCTS_MAX;

  const toggle = (item: EmailProductItem) => {
    setSelected((current) => {
      if (current.some((entry) => entry.productId === item.productId)) {
        return current.filter((entry) => entry.productId !== item.productId);
      }
      if (current.length >= EMAIL_PRODUCTS_MAX) return current;
      return [...current, item];
    });
  };

  const remove = (productId: string) =>
    setSelected((current) =>
      current.filter((entry) => entry.productId !== productId),
    );

  // A product picked again from the results takes its fresh snapshot.
  const confirm = () => {
    const fresh = new Map(results.map((item) => [item.productId, item]));
    onConfirm(selected.map((item) => fresh.get(item.productId) ?? item));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isChange ? "Change products" : "Add products"}
        </DialogTitle>
        <DialogDescription>
          Choose up to {EMAIL_PRODUCTS_MAX} products to feature. Each shows its
          photo, name and price with a button to its page.
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
              <>No published products match &ldquo;{searchTerm}&rdquo;</>
            ) : (
              "You don't have any published products yet."
            )}
          </p>
        ) : (
          <>
            {results.map((item) => {
              const isSelected = selectedIds.has(item.productId);
              const disabled = !isSelected && isFull;
              return (
                <button
                  key={item.productId}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onClick={() => toggle(item)}
                  className={cn(
                    "focus-visible:ring-ring hover:bg-muted/50 flex w-full items-center gap-3 rounded-md border p-2 text-left focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    isSelected && "border-primary bg-primary/5",
                  )}
                >
                  <ProductThumb url={item.imageUrl} className="size-10" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <PriceLabel item={item} />
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
          {selected.length} of {EMAIL_PRODUCTS_MAX} chosen
        </p>
        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <li
                key={item.productId}
                className="bg-muted/60 flex items-center gap-2 rounded-full border py-0.5 pr-1 pl-0.5 text-xs"
              >
                <ProductThumb
                  url={item.imageUrl}
                  className="size-6 rounded-full"
                />
                <span className="max-w-40 truncate">{item.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item.productId)}
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
          onClick={confirm}
          disabled={selected.length === 0}
        >
          {isChange ? "Update products" : "Add products"}
        </Button>
      </DialogFooter>
    </>
  );
}
