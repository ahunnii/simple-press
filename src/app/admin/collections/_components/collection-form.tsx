"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
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
import { Form } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  businessId: string;
  collectionId?: string;
  collection?: RouterOutputs["collections"]["getById"];
  allProducts: RouterOutputs["product"]["secureGetAll"];
};

const collectionFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  published: z.boolean(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  imageFile: z.instanceof(File).optional(),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

export function CollectionForm({ collection, allProducts }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [published, setPublished] = useState(true);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      ...collection,
      description: collection?.description ?? undefined,
      imageUrl: collection?.imageUrl ?? undefined,
      metaTitle: collection?.metaTitle ?? undefined,
      metaDescription: collection?.metaDescription ?? undefined,
      imageFile: undefined,
    },
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  // Initialize form when collection loads
  useState(() => {
    if (collection) {
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

  const handleSubmit = async (data: CollectionFormValues) => {
    let imageUrl: string | undefined = data?.imageUrl ?? undefined;

    const imageFile = data.imageFile;
    if (imageFile instanceof File) {
      try {
        const response = await imageUploader.upload(imageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) imageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    }

    if (collection?.id) {
      updateMutation.mutate({
        id: collection.id,
        name: data.name,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
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

  const isDirty = form.formState.isDirty;

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
          className="h-auto bg-gray-50"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/collections">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="text-base font-medium">
                  {collection?.id
                    ? (collection?.name ?? "Edit Collection")
                    : "New Collection"}
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
              <div className="flex items-center gap-2">
                <Label htmlFor="published">Published</Label>
                <Switch
                  id="published"
                  checked={published}
                  onCheckedChange={setPublished}
                />
              </div>

              {!collection?.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}

              {collection?.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || !isDirty}
                  onClick={() => {
                    setPublished(collection?.published ?? true);
                    setSelectedProductIds(
                      new Set(
                        collection?.collectionProducts.map(
                          (cp) => cp.product.id,
                        ) ?? [],
                      ),
                    );
                  }}
                  className="hidden md:inline-flex"
                >
                  Reset
                </Button>
              )}

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
          <div className="admin-container space-y-6">
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
                <CardDescription>
                  Collection name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputFormField
                  form={form}
                  name="name"
                  label="Name *"
                  placeholder="Summer Collection"
                  required
                />
                <TextareaFormField
                  form={form}
                  name="description"
                  label="Description"
                  placeholder="Describe this collection..."
                  rows={4}
                />

                <ImageUploadFormField
                  form={form}
                  name="imageFile"
                  label="Collection Image"
                  description="Upload your collection image here!"
                  existingPreviewUrl={collection?.imageUrl ?? undefined}
                  inputRef={imageFileInputRef}
                />

                {/* <div>
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
              </div> */}
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
                <ScrollArea className="h-96 min-h-0 overflow-hidden">
                  <div className="space-y-2">
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
                </ScrollArea>

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
                <InputFormField
                  form={form}
                  name="metaTitle"
                  label="Meta Title"
                  placeholder="Collection Name | Store Name"
                  description={`${form.watch("metaTitle")?.length ?? 0}/60 characters (optimal: 50-60)`}
                />

                <TextareaFormField
                  form={form}
                  name="metaDescription"
                  label="Meta Description"
                  placeholder="Brief description of this collection..."
                  rows={3}
                  description={`${form.watch("metaDescription")?.length ?? 0}/160 characters (optimal: 150-160)`}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </>
  );
}
