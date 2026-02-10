/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { ProductVariant } from "generated/prisma";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { slugify } from "~/lib/utils";
import { api } from "~/trpc/react";
import { ImageUploader, type ProductImage } from "./image-uploader";
import { VariantManager } from "./variant-manager";

type ProductFormProps = {
  businessId: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    published: boolean;
    variants?: Array<{
      id: string;
      name: string;
      sku: string | null;
      price: number | null;
      inventoryQty: number;
      options: any;
    }>;
    images?: Array<{
      id: string;
      url: string;
      altText: string | null;
      sortOrder: number;
    }>;
  };
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

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<ProductImage[]>([]);
  /** Captured at submit time so syncImages uses the user's order even if product refetch overwrites state */
  const imagesToSyncRef = useRef<ProductImage[]>([]);

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
  // Form state
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(
    product ? (product.price / 100).toFixed(2) : "",
  );
  const [published, setPublished] = useState(product?.published ?? false);
  const [variants, setVariants] = useState<any[]>(
    product?.variants?.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      inventoryQty: v.inventoryQty,
      options: v.options as Record<string, string>,
    })) ?? [],
  );

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) {
      // Only auto-generate for new products
      setSlug(slugify(value));
    }
  };

  const addImageMutation = api.product.addImage.useMutation({
    onError: (error) => {
      setError(error.message ?? "Failed to add image");
      toast.error(error.message ?? "Failed to add image");
    },
    onSuccess: (data) => {
      toast.success("Image added successfully");
    },
    onSettled: () => {
      setIsSubmitting(false);
      router.refresh();
    },
  });

  const syncImagesMutation = api.product.syncImages.useMutation({
    onError: (error) => {
      setError(error.message ?? "Failed to sync images");
      toast.error(error.message ?? "Failed to sync images");
    },
    onSuccess: (data) => {
      toast.success("Images synced successfully");
    },
  });

  const createProductMutation = api.product.create.useMutation({
    onError: (error) => {
      setError(error.message ?? "Failed to save product");
      toast.error(error.message ?? "Failed to save product");
    },
    onSuccess: async (data) => {
      if (images.length > 0) {
        await Promise.all(
          images.map((image) =>
            addImageMutation.mutateAsync({
              productId: data.productId,
              url: image.url,
              altText: image.altText,
              sortOrder: image.sortOrder,
            }),
          ),
        );
      }

      router.push(`/admin/products/${data.productId}`);
      toast.success(data.message);
    },
    onSettled: () => {
      setIsSubmitting(false);
      router.refresh();
    },
  });
  const updateProductMutation = api.product.update.useMutation({
    onError: (error) => {
      setError(error.message ?? "Failed to save product");
      toast.error(error.message ?? "Failed to save product");
    },
    onSuccess: async (data) => {
      await syncImagesMutation.mutateAsync({
        productId: data.productId,
        images: imagesToSyncRef.current,
      });
      router.push(`/admin/products/${data.productId}`);
      toast.success(data.message);
    },
    onSettled: () => {
      setIsSubmitting(false);
      router.refresh();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validation
      if (!name.trim()) {
        throw new Error("Product name is required");
      }

      if (!slug.trim()) {
        throw new Error("Product slug is required");
      }

      if (!price || parseFloat(price) <= 0) {
        throw new Error("Valid price is required");
      }

      // Convert price to cents
      const priceInCents = Math.round(parseFloat(price) * 100);

      if (product) {
        imagesToSyncRef.current = images;
        updateProductMutation.mutate({
          id: product.id,
          name,
          slug,
          description: description || undefined,
          price: priceInCents,
          published,
          variants: variants?.map((v: ProductVariant) => ({
            id: v.id,
            name: v.name,
            sku: v.sku ?? undefined,
            price: v.price ?? priceInCents,

            inventoryQty: v.inventoryQty,
            options: v.options as Record<string, string>,
          })),
        });
      } else {
        createProductMutation.mutate({
          name,
          slug,
          description: description || undefined,
          price: priceInCents,
          published,
          variants: variants?.map((v: ProductVariant) => ({
            name: v.name,
            sku: v.sku ?? undefined,
            price: v.price ?? priceInCents,
            inventoryQty: v.inventoryQty,
            options: v.options as Record<string, string>,
          })),
        });
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Essential details about your product
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Classic White T-Shirt"
              required
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="classic-white-t-shirt"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Used in product URL: /products/{slug || "your-product"}
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Set your product pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="price">Price (USD) *</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="19.99"
                className="pl-7"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <VariantManager
        variants={variants}
        onChange={setVariants}
        basePrice={price ? Math.round(parseFloat(price) * 100) : 0}
        existingVariantOptions={getExistingVariantOptions(
          product?.variants as
            | Array<{ options: Record<string, string> }>
            | undefined,
        )}
      />

      {/* Publishing */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
          <CardDescription>Control product visibility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="published">Publish Product</Label>
              <p className="text-sm text-gray-500">
                Make this product visible to customers
              </p>
            </div>
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
        </CardContent>
      </Card>

      <ImageUploader
        images={images}
        onImagesChange={setImages}
        maxImages={10}
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {product ? "Update Product" : "Create Product"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
