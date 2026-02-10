"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type CollectionFormProps = {
  businessId: string;
  collectionId?: string;
};

export function CollectionForm({
  businessId,
  collectionId,
}: CollectionFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get existing collection if editing
  const { data: collection, isLoading: loadingCollection } =
    api.collections.getById.useQuery(
      { id: collectionId! },
      { enabled: !!collectionId },
    );

  // Get all products for selection
  const { data: allProducts } = api.product.secureGetAll.useQuery();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );

  // Initialize form when collection loads
  useState(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description ?? "");
      setImageUrl(collection.imageUrl ?? "");
      setPublished(collection.published);
      setMetaTitle(collection.metaTitle ?? "");
      setMetaDescription(collection.metaDescription ?? "");
      setSelectedProductIds(
        new Set(collection.collectionProducts.map((cp) => cp.product.id)),
      );
    }
  });

  const createMutation = api.collections.create.useMutation({
    onSuccess: async (data) => {
      // Add products to collection
      for (const productId of selectedProductIds) {
        await utils.client.collections.addProduct.mutate({
          collectionId: data.id,
          productId,
        });
      }

      setSuccess(true);
      void utils.collections.getByBusiness.invalidate();
      setTimeout(() => router.push("/admin/collections"), 1500);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const updateMutation = api.collections.update.useMutation({
    onSuccess: async (data) => {
      // Sync products: add new ones, remove deselected ones
      if (collection) {
        const currentProductIds = new Set(
          collection.collectionProducts.map((cp) => cp.product.id),
        );

        // Add new products
        for (const productId of selectedProductIds) {
          if (!currentProductIds.has(productId)) {
            await utils.client.collections.addProduct.mutate({
              collectionId: data.id,
              productId,
            });
          }
        }

        // Remove deselected products
        for (const productId of currentProductIds) {
          if (!selectedProductIds.has(productId)) {
            await utils.client.collections.removeProduct.mutate({
              collectionId: data.id,
              productId,
            });
          }
        }
      }

      setSuccess(true);
      void utils.collections.getByBusiness.invalidate();
      setTimeout(() => router.push("/admin/collections"), 1500);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Collection name is required");
      return;
    }

    if (collectionId) {
      updateMutation.mutate({
        id: collectionId,
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        published,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      });
    } else {
      createMutation.mutate({
        businessId,
        name,
        description,
        imageUrl,
        published,
        metaTitle,
        metaDescription,
      });
    }
  };

  const toggleProduct = (productId: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProductIds(newSet);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (loadingCollection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {collectionId ? "Edit Collection" : "Create Collection"}
          </h1>
          <p className="mt-1 text-gray-600">
            {collectionId
              ? "Update collection details"
              : "Add a new collection to organize your products"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                Collection saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Collection name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Summer Collection"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this collection..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Collection Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {imageUrl && (
                  <div className="relative mt-2 h-48 w-full rounded bg-gray-100">
                    <Image
                      src={imageUrl}
                      alt="Preview"
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Select products to include in this collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {allProducts?.map((product) => (
                  <div
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-gray-50"
                    onClick={() => toggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={selectedProductIds.has(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    {product.images[0] && (
                      <div className="relative h-12 w-12 rounded bg-gray-100">
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        ${(product.price / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm text-gray-500">
                {selectedProductIds.size} products selected
              </p>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>Search engine optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Collection Name | Store Name"
                  maxLength={60}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {metaTitle.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief description of this collection..."
                  rows={3}
                  maxLength={160}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
              <CardDescription>Control collection visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="published">Published</Label>
                  <p className="text-sm text-gray-500">
                    Make this collection visible on your storefront
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

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {collectionId ? "Update Collection" : "Create Collection"}
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
      </div>
    </div>
  );
}
