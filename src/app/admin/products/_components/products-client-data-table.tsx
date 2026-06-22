"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Edit, Eye, MoreVertical, Trash } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { DeleteProductAlertDialog } from "./delete-product-alert-dialog";

type Props = {
  products: RouterOutputs["product"]["secureList"]["products"];
};

export function ProductsTable({ products }: Props) {
  const apiUtils = api.useUtils();
  const router = useRouter();

  // ── single-delete state ───────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);

  // ── selection state ───────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection whenever the products page changes
  useEffect(() => {
    setSelected(new Set());
  }, [products]);

  const allIds = products.map((p) => p.id);
  const selectedCount = selected.size;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── bulk-delete confirm dialog ────────────────────────────────────────────
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── mutations ─────────────────────────────────────────────────────────────
  const deleteProduct = api.product.delete.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete product");
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onSettled: () => {
      void apiUtils.product.invalidate();
      router.refresh();
    },
  });

  const bulkSetPublished = api.product.bulkSetPublished.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to update products");
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setSelected(new Set());
    },
    onSettled: () => {
      void apiUtils.product.invalidate();
      router.refresh();
    },
  });

  const bulkDelete = api.product.bulkDelete.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete products");
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setSelected(new Set());
    },
    onSettled: () => {
      void apiUtils.product.invalidate();
      router.refresh();
    },
  });

  const duplicateProduct = api.product.duplicate.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to duplicate product");
    },
    onSuccess: (data) => {
      toast.success(data.message);
      void apiUtils.product.invalidate();
      router.push(`/admin/products/${data.productId}`);
    },
  });

  const bulkPending = bulkSetPublished.isPending || bulkDelete.isPending;

  return (
    <div className="space-y-2">
      {/* ── Bulk action toolbar ── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 shadow-sm">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkPending}
              onClick={() =>
                bulkSetPublished.mutate({
                  ids: [...selected],
                  published: true,
                })
              }
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkPending}
              onClick={() =>
                bulkSetPublished.mutate({
                  ids: [...selected],
                  published: false,
                })
              }
            >
              Unpublish
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkPending}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash className="mr-1.5 h-4 w-4" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Products</caption>
            <thead className="border-b">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all products on this page"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Variants
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {products.map((product) => {
                let displayPrice = "N/A";
                if (
                  product._count.variants > 0 &&
                  product.variants &&
                  product.variants.length > 0
                ) {
                  const prices = product.variants
                    .filter((v) => v.price !== null && v.price !== undefined)
                    .map((v) => v.price) as number[];

                  if (prices.length > 0) {
                    const minPrice = Math.min(...prices);
                    const allSamePrice = prices.every((p) => p === minPrice);

                    displayPrice = allSamePrice
                      ? formatPrice(minPrice)
                      : `${formatPrice(minPrice)}+`;
                  } else if (product.price != null) {
                    displayPrice = formatPrice(product.price);
                  }
                } else if (product.price != null) {
                  displayPrice = formatPrice(product.price);
                }
                return (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selected.has(product.id)}
                        onCheckedChange={() => toggleRow(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/products/${product.id}`}>
                        <div className="flex items-center">
                          {product.images[0] ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                              <Image
                                src={product.images[0].url}
                                alt={product.images[0].altText ?? product.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                              <span className="text-xs text-muted-foreground">
                                No img
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="font-medium text-foreground">
                              {product.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product.slug}
                            </div>
                          </div>
                        </div>{" "}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.published ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-foreground">
                      {displayPrice}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                      {product._count.variants > 0
                        ? `${product._count.variants} variant${product._count.variants !== 1 ? "s" : ""}`
                        : "No variants"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions for {product.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${product.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/shop/${product.slug}`}
                              target="_blank"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={duplicateProduct.isPending}
                            onClick={() => duplicateProduct.mutate(product.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeleteId(product.id);
                              setProductName(product.name);
                              setOpen(true);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DeleteProductAlertDialog
          deleteId={deleteId}
          open={open}
          setOpen={setOpen}
          productName={productName}
          onDelete={() => deleteProduct.mutate(deleteId ?? "")}
          isPending={deleteProduct.isPending}
        />
      </Card>

      {/* ── Bulk delete confirmation dialog ── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} product{selectedCount !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} selected product
              {selectedCount !== 1 ? "s" : ""} and all associated images. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDelete.isPending}
              onClick={(e) => {
                e.preventDefault();
                bulkDelete.mutate({ ids: [...selected] });
              }}
            >
              {bulkDelete.isPending
                ? "Deleting…"
                : `Delete ${selectedCount} product${selectedCount !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
