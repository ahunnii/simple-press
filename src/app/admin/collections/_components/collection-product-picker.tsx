"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import Image from "next/image";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Search, TriangleAlert, X } from "lucide-react";

import type { CollectionFormData } from "~/lib/validators/collections";
import { api } from "~/trpc/react";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { FormField } from "~/components/ui/form";
import { Input } from "~/components/ui/input";

import { EMPTY_ON_STOREFRONT_MESSAGE } from "../_lib/collection-copy";

const SEARCH_LIMIT = 10;

export type ProductSummary = {
  id: string;
  name: string;
  price: number;
  published: boolean;
  images: { url: string }[];
};

type Props = {
  form: UseFormReturn<CollectionFormData>;
  initialProducts: ProductSummary[];
};

function SortableProductRow({
  product,
  onRemove,
}: {
  product: ProductSummary;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded border p-3"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="focus-visible:ring-ring text-muted-foreground hover:text-foreground flex h-9 w-9 cursor-move items-center justify-center focus-visible:ring-1 focus-visible:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="bg-muted relative h-10 w-10 shrink-0 rounded">
        <Image
          src={product.images[0]?.url ?? "/placeholder.svg"}
          alt={product.name}
          fill
          className="rounded object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{product.name}</p>
          {!product.published && (
            <Badge variant="secondary" className="shrink-0">
              Draft
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          ${(product.price / 100).toFixed(2)}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${product.name}`}
        className="focus-visible:ring-ring text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full focus-visible:ring-1 focus-visible:outline-none"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function CollectionProductPicker({ form, initialProducts }: Props) {
  const [productCache, setProductCache] = useState<
    Record<string, ProductSummary>
  >(() => Object.fromEntries(initialProducts.map((p) => [p.id, p])));
  const [query, setQuery] = useState("");

  const debouncedQuery = useDebouncedValue(query, 250);
  const searchTerm = debouncedQuery.trim();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const searchQuery = api.product.searchForPicker.useQuery(
    { query: searchTerm, limit: SEARCH_LIMIT },
    {
      enabled: searchTerm.length > 0,
      placeholderData: (prev) => prev,
    },
  );

  const memberIds = form.watch("productIds");
  const memberCount = memberIds.length;
  const isPublished = form.watch("published");

  const showResults = query.trim().length > 0;
  const isSearching = searchQuery.isFetching || query.trim() !== searchTerm;
  const results = showResults ? (searchQuery.data ?? []) : [];

  const publishedMemberCount = memberIds.filter(
    (id) => productCache[id]?.published,
  ).length;
  const showEmptyWarning = isPublished && publishedMemberCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Search to add products, then drag them into the order shoppers should
          see.
        </CardDescription>
        <CardAction>
          <span className="text-muted-foreground text-sm">
            {memberCount} in collection
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="productIds"
          render={({ field, fieldState }) => {
            const ids = field.value;

            const addProduct = (product: ProductSummary) => {
              if (ids.includes(product.id)) return;
              setProductCache((prev) => ({ ...prev, [product.id]: product }));
              field.onChange([...ids, product.id]);
            };

            const removeProduct = (productId: string) => {
              field.onChange(ids.filter((id) => id !== productId));
            };

            const handleDragEnd = (event: DragEndEvent) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                const oldIndex = ids.indexOf(active.id as string);
                const newIndex = ids.indexOf(over.id as string);
                field.onChange(arrayMove(ids, oldIndex, newIndex));
              }
            };

            const members = ids
              .map((id) => productCache[id])
              .filter((p): p is ProductSummary => p !== undefined);

            return (
              <>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    type="text"
                    aria-label="Search products to add"
                    placeholder="Search products to add…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const first = results.find((p) => !ids.includes(p.id));
                        if (first) addProduct(first);
                        return;
                      }
                      if (e.key === "Escape") {
                        setQuery("");
                      }
                    }}
                    className="pl-10"
                  />
                </div>

                {showResults && (
                  <div
                    aria-live="polite"
                    className="mt-2 max-h-64 space-y-1.5 overflow-y-auto"
                  >
                    {results.length === 0 ? (
                      <p className="text-muted-foreground py-6 text-center text-sm">
                        {isSearching ? (
                          "Searching…"
                        ) : (
                          <>No products match &ldquo;{searchTerm}&rdquo;</>
                        )}
                      </p>
                    ) : (
                      <>
                        {results.map((product) => {
                          const added = ids.includes(product.id);
                          return (
                            <button
                              key={product.id}
                              type="button"
                              disabled={added}
                              onClick={() => addProduct(product)}
                              className="focus-visible:ring-ring hover:bg-muted/50 flex w-full items-center gap-3 rounded border p-3 text-left focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
                            >
                              <div className="bg-muted relative h-10 w-10 shrink-0 rounded">
                                <Image
                                  src={
                                    product.images[0]?.url ?? "/placeholder.svg"
                                  }
                                  alt={product.name}
                                  fill
                                  className="rounded object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium">
                                    {product.name}
                                  </p>
                                  {!product.published && (
                                    <Badge
                                      variant="secondary"
                                      className="shrink-0"
                                    >
                                      Draft
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  ${(product.price / 100).toFixed(2)}
                                </p>
                              </div>
                              {added && (
                                <span className="text-muted-foreground bg-muted shrink-0 rounded-full px-2 py-0.5 text-xs">
                                  Added
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {results.length >= SEARCH_LIMIT && (
                          <p className="text-muted-foreground px-1 py-1 text-xs">
                            Showing first {SEARCH_LIMIT} — refine your search
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {showEmptyWarning && (
                  <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {EMPTY_ON_STOREFRONT_MESSAGE}
                      </p>
                      <p className="text-amber-700">
                        {ids.length === 0
                          ? "This collection has no products yet, so its storefront page renders empty."
                          : "Every product in this collection is still a draft, so its storefront page renders empty."}
                      </p>
                    </div>
                  </div>
                )}

                {fieldState.error && (
                  <p className="text-destructive text-sm">
                    {fieldState.error.message}
                  </p>
                )}

                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    In this collection
                  </p>
                  {ids.length > 1 && (
                    <p className="text-muted-foreground/70 text-xs">
                      drag to reorder
                    </p>
                  )}
                </div>

                {members.length === 0 ? (
                  <p className="text-muted-foreground mt-2 rounded border border-dashed py-6 text-center text-sm">
                    No products yet — search above to add some.
                  </p>
                ) : (
                  <>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={ids}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="mt-2 space-y-1.5">
                          {members.map((product) => (
                            <SortableProductRow
                              key={product.id}
                              product={product}
                              onRemove={() => removeProduct(product.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <p className="text-muted-foreground mt-3 text-xs">
                      Shoppers see this order by default, under the
                      &ldquo;Featured&rdquo; sort.
                    </p>
                  </>
                )}
              </>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
