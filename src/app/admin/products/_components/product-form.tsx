"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { FormProductImage, FormVariant } from "../_validators/schema";
import type { ProductFormSchema } from "~/lib/validators/product";
import type { RouterOutputs } from "~/trpc/react";
import { slugify } from "~/lib/utils";
import { productFormSchema } from "~/lib/validators/product";
import { api } from "~/trpc/react";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { ImageUploader } from "./image-uploader";
import { VariantManager } from "./variant-manager";

type Props = {
  product?: RouterOutputs["product"]["secureGet"];
};

/** Derive option names and values from existing variants (e.g. Size → [S,M,L], Color → [Red]). */
function getExistingVariantOptions(
  variants: Array<{ options: Record<string, string> }> | undefined,
): Array<{ name: string; values: string[] }> {
  if (!variants?.length) return [];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    const opts = v.options ?? {};
    for (const k of Object.keys(opts)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys.map((name) => {
    const valueSet = new Set<string>();
    for (const v of variants) {
      const opts = v.options ?? {};
      const val = opts[name];
      if (val != null && val !== "") valueSet.add(val);
    }
    return { name, values: Array.from(valueSet) };
  });
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Images state (kept separate as they're uploaded independently via Better Upload)
  const [images, setImages] = useState<FormProductImage[]>([]);
  const imagesToSyncRef = useRef<FormProductImage[]>([]);

  // Variants state (kept separate due to complex nested structure and VariantManager component)
  const [variants, setVariants] = useState<FormVariant[]>(
    (product?.variants as FormVariant[]) ?? [],
  );

  // Initialize form with react-hook-form
  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      id: product?.id ?? undefined,
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? undefined,
      price: product?.price ? product.price / 100 : 0, // Convert cents to dollars
      published: product?.published ?? false,
    },
  });

  // Load existing images on mount
  useEffect(() => {
    if (product?.images) {
      setImages(
        product.images.map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder,
        })),
      );
    }
  }, [product]);

  // Auto-generate slug from name (only for new products)
  const handleNameChange = (value: string) => {
    if (!product) {
      form.setValue("slug", slugify(value), { shouldValidate: true });
    }
  };

  // Mutations
  const addImagesMutation = api.product.addImages.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to add images");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Adding images...");
    },
  });

  const syncImagesMutation = api.product.syncImages.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to sync images");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Images synced successfully");
      router.push(`/admin/products/${data.productId}`);
    },
    onMutate: () => {
      toast.loading("Syncing images...");
    },
    onSettled: () => {
      router.refresh();
    },
  });

  const createProductMutation = api.product.create.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to create product");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
    },
    onMutate: () => {
      toast.loading("Creating product...");
    },
    onSettled: () => {
      router.refresh();
    },
  });

  const updateProductMutation = api.product.update.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update product");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
    },
    onMutate: () => {
      toast.loading("Updating product...");
    },
    onSettled: () => {
      router.refresh();
    },
  });

  const deleteProductMutation = api.product.delete.useMutation({
    onError: (error) => {
      setError(error.message ?? "Failed to delete product");
      toast.error(error.message ?? "Failed to delete product");
    },
    onSuccess: () => {
      toast.success("Product deleted successfully");
      router.push("/admin/products");
    },
    onSettled: () => {
      router.refresh();
    },
  });

  const onSubmit = async (data: ProductFormSchema) => {
    // Convert price to cents
    const priceInCents = Math.round(data.price * 100);

    if (product) {
      // Update existing product
      imagesToSyncRef.current = images;

      const response = await updateProductMutation.mutateAsync({
        id: product.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        published: data.published,
        variants: variants?.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          inventoryQty: v.inventoryQty,
          options: v.options,
        })),
      });

      if (response.productId) {
        void syncImagesMutation.mutateAsync({
          productId: response.productId,
          images: imagesToSyncRef.current,
        });
      }
    } else {
      // Create new product
      const response = await createProductMutation.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        published: data.published,
        variants: variants?.map((v) => ({
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          inventoryQty: v.inventoryQty,
          options: v.options,
        })),
      });

      if (images.length > 0 && !!response.productId) {
        await addImagesMutation.mutateAsync({
          productId: response.productId,
          images: images.map((image) => ({
            productId: response.productId,
            url: image.url,
            altText: image.altText,
            sortOrder: image.sortOrder,
          })),
        });

        router.push(`/admin/products/${response.productId}`);
      }
    }
  };

  const isSubmitting =
    updateProductMutation.isPending ||
    addImagesMutation.isPending ||
    createProductMutation.isPending ||
    syncImagesMutation.isPending;

  const isUploading =
    addImagesMutation.isPending || syncImagesMutation.isPending;

  const isDeleting = deleteProductMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-6"
        >
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="border-border/30 sticky top-0 z-10 -mx-4 -mt-4 flex w-[calc(100%+2rem)] justify-center px-4 py-3 transition-all duration-300 md:-mx-6 md:w-[calc(100%+3rem)] md:px-6">
            <div
              className={`flex w-[95%] items-center justify-between gap-2 rounded-full border px-4 py-3 shadow-sm backdrop-blur transition-all duration-300 ${
                isDirty
                  ? "bg-background/95 supports-backdrop-filter:bg-background/80 border-amber-200 shadow-md dark:border-amber-800"
                  : "border-border/50 bg-background/60 supports-backdrop-filter:bg-background/50"
              }`}
            >
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isSubmitting}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => form.reset()}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                      {isUploading ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    "Save product"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about your product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputFormField
                form={form}
                name="name"
                label="Product Name *"
                onChangeAdditional={handleNameChange}
                placeholder="e.g., Classic White T-Shirt"
                required
                autoFocus
              />

              <InputFormField
                form={form}
                name="slug"
                label="URL Slug *"
                placeholder="classic-white-t-shirt"
                onChange={(value) =>
                  form.setValue("slug", slugify(value), {
                    shouldValidate: true,
                  })
                }
                required
                description={`Used in product URL: /products/${form.watch("slug") || "your-product"}`}
              />

              <TextareaFormField
                form={form}
                name="description"
                label="Description"
                placeholder="Describe your product..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set your product pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="19.99"
                          className="pl-7"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Base price in USD (variant prices can override this)
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Variants */}
          <VariantManager
            variants={variants}
            onChange={setVariants}
            basePrice={Math.round((form.watch("price") || 0) * 100)}
            existingVariantOptions={getExistingVariantOptions(
              product?.variants as
                | Array<{ options: Record<string, string> }>
                | undefined,
            )}
          />

          {/* Images */}
          <ImageUploader
            images={images}
            onImagesChange={setImages}
            maxImages={10}
          />

          {/* Publishing */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
              <CardDescription>Control product visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <div className="space-y-1">
                      <FormLabel>Publish Product</FormLabel>
                      <FormDescription>
                        Make this product visible to customers
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{form.watch("name")}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteProductMutation.mutate(product?.id ?? "");
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
