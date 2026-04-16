"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { FormProductImage, FormVariant } from "../_validators/schema";
import type { ProductFormSchema } from "~/lib/validators/product";
import type { RouterOutputs } from "~/trpc/react";
import { cn, sanitizeSlugInput, slugify } from "~/lib/utils";
import { productFormSchema } from "~/lib/validators/product";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { getExistingVariantOptions } from "../_utils/existing-variant-options";
import { ImageUploader } from "./image-uploader";
import { ProductFeaturesField } from "./product-features-field";
import { VariantManager } from "./variant-manager";

type Props = {
  product?: RouterOutputs["product"]["secureGet"];
  galleriesEnabled?: boolean;
};

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] } as const;

function parseStoredAdditionalFields(raw: unknown) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as {
    additionalInformation?: unknown;
    productFeatures?: Array<{ icon: string; text: string }>;
    comingSoon?: boolean;
    productTagline?: string;
  };
}

export function ProductForm({ product, galleriesEnabled }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const utils = api.useUtils();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Images state (kept separate as they're uploaded independently via Better Upload)
  const [images, setImages] = useState<FormProductImage[]>([]);
  const imagesToSyncRef = useRef<FormProductImage[]>([]);
  const initialImagesRef = useRef<FormProductImage[]>([]);

  // Variants state (kept separate due to complex nested structure and VariantManager component)
  const [variants, setVariants] = useState<FormVariant[]>(
    (product?.variants as FormVariant[]) ?? [],
  );

  const storedAdditional = parseStoredAdditionalFields(
    product?.additionalFields ?? null,
  );

  // Initialize form with react-hook-form
  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? undefined,
      price: product?.price ? product.price / 100 : 0, // Convert cents to dollars
      compareAtPrice: product?.compareAtPrice ? product.compareAtPrice / 100 : undefined,
      published: product?.published ?? false,
      trackInventory: product?.trackInventory ?? false,
      inventoryQty: product?.inventoryQty ?? 0,
      allowBackorders: product?.allowBackorders ?? false,
      lowInventoryThreshold: product?.lowInventoryThreshold ?? undefined,
      additionalFields: {
        additionalInformation: (storedAdditional?.additionalInformation as
          | Record<string, unknown>
          | undefined) ?? { ...EMPTY_TIPTAP_DOC },
        productFeatures: storedAdditional?.productFeatures ?? [],
        comingSoon: storedAdditional?.comingSoon ?? false,
        productTagline: storedAdditional?.productTagline ?? "",
      },
    },
  });

  /** Re-baseline after TipTap normalizes empty doc on mount (avoids false dirty). */
  const dirtyBaselineRef = useRef(false);
  useEffect(() => {
    if (dirtyBaselineRef.current) return;
    dirtyBaselineRef.current = true;
    const raf = requestAnimationFrame(() => {
      form.reset(form.getValues());
    });
    return () => cancelAnimationFrame(raf);
  }, [form]);

  // Load existing images on mount
  useEffect(() => {
    if (product?.images) {
      const loaded = product.images.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
      }));
      setImages(loaded);
      initialImagesRef.current = loaded;
    }
  }, [product]);

  const isImagesDirty = useMemo(() => {
    const initial = initialImagesRef.current;
    if (images.length !== initial.length) return true;
    return images.some((img, i) => {
      const orig = initial[i];
      return (
        !orig ||
        img.id !== orig.id ||
        img.url !== orig.url ||
        img.altText !== orig.altText ||
        img.sortOrder !== orig.sortOrder
      );
    });
  }, [images]);

  // Auto-generate slug from name (only for new products)
  const handleNameChange = (value: string | null) => {
    if (!value) return;
    if (!product) {
      form.setValue("slug", slugify(value), { shouldValidate: true });
    }
  };

  // Mutations
  const syncImagesMutation = api.product.syncImages.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to sync images");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      void utils.product.invalidate();
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Syncing images...");
    },
  });

  const createProductMutation = api.product.create.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to create product");
    },
    onSuccess: (data) => {
      toast.dismiss();
      void utils.product.invalidate();
      toast.success(data.message);
    },
    onMutate: () => {
      toast.loading("Creating product...");
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
      void utils.product.invalidate();
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating product...");
    },
  });

  const deleteProductMutation = api.product.delete.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete product");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Product deleted successfully");
      void utils.product.invalidate();
      router.push("/admin/products");
    },
    onMutate: () => {
      toast.loading("Deleting product...");
    },
  });

  const onSubmit = async (data: ProductFormSchema) => {
    // Convert price to cents
    const priceInCents = Math.round(data.price * 100);
    const compareAtPriceInCents = data.compareAtPrice
      ? Math.round(data.compareAtPrice * 100)
      : undefined;

    if (product) {
      // Update existing product
      imagesToSyncRef.current = images;

      await updateProductMutation.mutateAsync({
        id: product.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        compareAtPrice: compareAtPriceInCents,
        published: data.published,
        trackInventory: data.trackInventory,
        allowBackorders: data.allowBackorders,
        inventoryQty: data.inventoryQty ?? 0,
        lowInventoryThreshold: data.lowInventoryThreshold ?? undefined,
        variants: variants?.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          compareAtPrice: v.compareAtPrice ?? undefined,
          inventoryQty: v.inventoryQty,
          options: v.options,
        })),
        additionalFields: {
          additionalInformation: data.additionalFields?.additionalInformation,
          productFeatures: data.additionalFields?.productFeatures ?? [],
          comingSoon: data.additionalFields?.comingSoon ?? false,
          productTagline: data.additionalFields?.productTagline ?? undefined,
        },
      });

      // New default baseline so isDirty clears (RHF only used initial defaultValues otherwise).
      form.reset(data);
      requestAnimationFrame(() => {
        form.reset(form.getValues());
      });

      if (product.id) {
        void syncImagesMutation.mutateAsync({
          productId: product.id,
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
        trackInventory: data.trackInventory,
        allowBackorders: data.allowBackorders,
        inventoryQty: data.inventoryQty ?? 0,
        lowInventoryThreshold: data.lowInventoryThreshold ?? undefined,
        compareAtPrice: compareAtPriceInCents,
        variants: variants?.map((v) => ({
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          compareAtPrice: v.compareAtPrice ?? undefined,
          inventoryQty: v.inventoryQty,
          options: v.options,
        })),
        additionalFields: {
          additionalInformation: data.additionalFields?.additionalInformation,
          productFeatures: data.additionalFields?.productFeatures ?? [],
          comingSoon: data.additionalFields?.comingSoon ?? false,
          productTagline: data.additionalFields?.productTagline ?? "",
        },
      });

      if (response.productId && images.length > 0) {
        await syncImagesMutation.mutateAsync({
          productId: response.productId,
          images: images.map((image) => ({
            url: image.url,
            altText: image.altText,
            sortOrder: image.sortOrder,
          })),
        });
      }

      if (response.productId) {
        router.push(`/admin/products/${response.productId}`);
      } else {
        form.reset({ ...data });
        requestAnimationFrame(() => {
          form.reset(form.getValues());
        });
      }
    }
  };

  const isSubmitting =
    updateProductMutation.isPending ||
    createProductMutation.isPending ||
    syncImagesMutation.isPending;

  const isDeleting = deleteProductMutation.isPending;
  const isDirty = form.formState.isDirty || isImagesDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="min-h-screen bg-gray-50"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="text-base font-medium">
                  {product
                    ? form.watch("name") || "Edit Product"
                    : "New Product"}
                </h1>

                <span
                  className={`admin-status-badge ${
                    isDirty ? "isDirty" : "isPublished"
                  }`}
                >
                  {isDirty ? "Unsaved Changes" : "Saved"}
                </span>
              </div>
            </div>

            <div className="toolbar-actions">
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="published">Published</Label>
                    <Switch
                      id="published"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
              {product && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || !isDirty}
                onClick={() => form.reset()}
                className="hidden md:inline-flex"
              >
                Reset
              </Button>

              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="saving-indicator" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Save changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="admin-container">
            <Tabs defaultValue="basics" className="w-full">
              <TabsList>
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="additional">Additional Info</TabsTrigger>
              </TabsList>
              <TabsContent value="basics" className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="col-span-1 space-y-4">
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
                          label="Product Name"
                          onChangeAdditional={handleNameChange}
                          placeholder="e.g., Classic White T-Shirt"
                          required
                          autoFocus
                        />

                        <InputFormField
                          form={form}
                          name="slug"
                          label="URL Slug"
                          placeholder="classic-white-t-shirt"
                          onChange={(value) =>
                            form.setValue("slug", sanitizeSlugInput(value), {
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
                        <CardDescription>
                          Set your product pricing
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {variants.length > 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Pricing is managed per variant. Edit each
                            variant&apos;s price in the{" "}
                            <span className="text-foreground font-medium">
                              Product Variants
                            </span>{" "}
                            section below.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price (USD)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                        $
                                      </span>
                                      <NumberInput
                                        step="0.01"
                                        min="0"
                                        placeholder="19.99"
                                        className="pl-7"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Base price in USD (variant prices can
                                    override this)
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="compareAtPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Compare At Price (USD)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                        $
                                      </span>
                                      <NumberInput
                                        step="0.01"
                                        min="0"
                                        placeholder="24.99"
                                        className="pl-7"
                                        {...field}
                                        value={field.value}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Original price shown crossed out. Leave
                                    blank to disable the sale display.
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <div className="col-span-1 space-y-4">
                    {/* Images */}
                    <ImageUploader
                      images={images}
                      onImagesChange={setImages}
                      maxImages={10}
                    />

                    {/* Base Inventory */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Inventory</CardTitle>
                        <CardDescription>
                          Set your product inventory
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <SwitchFormField
                          form={form}
                          name="trackInventory"
                          label="Track Inventory"
                          description="Enable inventory tracking for this product"
                        />

                        {form.watch("trackInventory") && (
                          <SwitchFormField
                            form={form}
                            name="allowBackorders"
                            label="Allow Backorders"
                            description="Allow customers to order when out of stock"
                          />
                        )}

                        {form.watch("trackInventory") &&
                          variants.length === 0 && (
                            <FormField
                              control={form.control}
                              name="inventoryQty"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Inventory Quantity</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <NumberInput
                                        step="1"
                                        min="0"
                                        placeholder="10"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Stock for this product when it has no
                                    variants.
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                          )}

                        {form.watch("trackInventory") && (
                          <FormField
                            control={form.control}
                            name="lowInventoryThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Low Inventory Threshold</FormLabel>
                                <FormControl>
                                  <NumberInput
                                    step="1"
                                    min="1"
                                    placeholder="e.g. 5"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Get an email alert when stock reaches this
                                  level. Leave blank to disable.
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Variants */}
                <VariantManager
                  variants={variants}
                  onChange={setVariants}
                  trackInventory={form.watch("trackInventory")}
                  basePrice={Math.round((form.watch("price") || 0) * 100)}
                  existingVariantOptions={getExistingVariantOptions(
                    product?.variants as
                      | Array<{ options: Record<string, string> }>
                      | undefined,
                  )}
                />
              </TabsContent>
              <TabsContent value="additional" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional information</CardTitle>
                    <CardDescription>
                      Shown in the &quot;Additional Information&quot; tab on the
                      product page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MinimalTiptapFormField
                      form={form}
                      name="additionalFields.additionalInformation"
                      output="json"
                      editorContentClassName={"p-4 min-h-[400px]"}
                      label="Additional information"
                      description='Shown in the "Additional Information" tab on the product page.'
                      galleriesEnabled={galleriesEnabled}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Feature highlights</CardTitle>
                      <CardDescription>
                        Key selling points shown as badges on the product page
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProductFeaturesField form={form} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Presentation</CardTitle>
                      <CardDescription>
                        Tagline and status badges for the product
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <InputFormField
                        form={form}
                        name="additionalFields.productTagline"
                        label="Product tagline"
                        description="On some templates this appears below the product name on the card."
                        placeholder="e.g., 'The perfect gift for any occasion'"
                      />

                      <SwitchFormField
                        form={form}
                        name="additionalFields.comingSoon"
                        label="Coming soon"
                        description="Show a 'Coming Soon' badge on the product page and card"
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
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
