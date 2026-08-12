"use client";

import type { FieldErrors, Path } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile, useUploadFiles } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ExternalLink,
  MoreHorizontal,
  RotateCcw,
  Save,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { FormProductImage, FormVariant } from "../_validators/schema";
import type { ProductFormSchema } from "~/lib/validators/product";
import type { RouterOutputs } from "~/trpc/react";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { getStoredPath } from "~/lib/uploads";
import { cn, sanitizeSlugInput, slugify } from "~/lib/utils";
import { productFormSchema } from "~/lib/validators/product";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { useSiteHost } from "~/hooks/use-site-host";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon } from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import {
  InputGroupNumberInput,
  NumberInput,
} from "~/components/ui/number-input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { OgImageUploader } from "~/components/inputs/og-image-uploader";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import {
  SearchResultPreview,
  SocialPreviewCard,
} from "~/components/admin/seo-previews";
import {
  erroredTabsFor,
  TabErrorDot,
} from "~/app/admin/_components/form-tab-errors";

import { getExistingVariantOptions } from "../_utils/existing-variant-options";
import { ImageUploader } from "./image-uploader";
import { ProductFeaturesField } from "./product-features-field";
import { VariantManager } from "./variant-manager";

type Props = {
  product?: RouterOutputs["product"]["secureGet"];
  galleriesEnabled?: boolean;
  collectionsEnabled?: boolean;
  allCollections?: RouterOutputs["collections"]["getAll"];
  pools?: RouterOutputs["baseInventoryUnit"]["list"];
};

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] } as const;

type ProductFormTab = "basics" | "collections" | "seo" | "additional";

const SEO_TAB_FIELDS = new Set<string>([
  "slug",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "ogImage",
]);

function tabForField(name: string): ProductFormTab {
  const root = name.split(".")[0] ?? name;
  if (SEO_TAB_FIELDS.has(root)) return "seo";
  if (root === "additionalFields") return "additional";
  return "basics";
}

const SHIPPING_MODE_LABELS: Record<string, string> = {
  free: "free shipping",
  flat_rate: "flat-rate shipping",
  flat_rate_with_threshold: "flat-rate shipping",
};

function optionalTrimmed(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

/** Format a Date as a local `datetime-local` input value (YYYY-MM-DDTHH:mm). */
function toDatetimeLocalInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export function ProductForm({
  product,
  galleriesEnabled,
  collectionsEnabled,
  allCollections = [],
  pools = [],
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const createAnotherRef = useRef(false);
  const utils = api.useUtils();

  const { data: businessInfo } = api.business.simplifiedGet.useQuery();
  const siteHost = useSiteHost();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [variantManagerKey, setVariantManagerKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ProductFormTab>("basics");
  const [showWeightAnyway, setShowWeightAnyway] = useState(false);

  const slugManuallyEditedRef = useRef(false);

  // Images state (kept separate as they're uploaded independently via Better Upload)
  const [images, setImages] = useState<FormProductImage[]>([]);
  const imagesToSyncRef = useRef<FormProductImage[]>([]);
  const initialImagesRef = useRef<FormProductImage[]>([]);

  // OG image state (kept separate, same pattern as gallery images)
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImageRemoved, setOgImageRemoved] = useState(false);

  // Collections state
  const initialCollectionIds =
    product?.collectionProducts?.map((cp) => cp.collectionId) ?? [];
  const [collectionIds, setCollectionIds] =
    useState<string[]>(initialCollectionIds);
  const [baselineCollectionIds, setBaselineCollectionIds] =
    useState<string[]>(initialCollectionIds);
  const [collectionSearch, setCollectionSearch] = useState("");

  // Variants state (kept separate due to complex nested structure and VariantManager component)
  // Stored price/compareAtPrice of 0 (persisted by the old form's `?? priceInCents`
  // fallback) means "inherit the base price" at runtime — normalize to undefined
  // on load so the submit-time $0 guard doesn't block saving legacy products.
  const [variants, setVariants] = useState<FormVariant[]>(
    ((product?.variants as FormVariant[]) ?? []).map((v) => ({
      ...v,
      price: v.price === 0 ? undefined : v.price,
      compareAtPrice: v.compareAtPrice === 0 ? undefined : v.compareAtPrice,
    })),
  );

  const storedAdditional = parseStoredAdditionalFields(
    product?.additionalFields ?? null,
  );

  // Initialize form with react-hook-form
  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      published: product?.published ?? true,
      scheduledPublishAt: toDatetimeLocalInput(product?.scheduledPublishAt),
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? undefined,
      price: product?.price ? product.price / 100 : 0, // Convert cents to dollars
      compareAtPrice: product?.compareAtPrice
        ? product.compareAtPrice / 100
        : undefined,
      cost: product?.cost != null ? product.cost / 100 : undefined,
      featured: product?.featured ?? false,
      sku: product?.sku ?? "",
      trackInventory: product?.trackInventory ?? false,
      inventoryQty: product?.inventoryQty ?? 0,
      allowBackorders: product?.allowBackorders ?? false,
      lowInventoryThreshold: product?.lowInventoryThreshold ?? undefined,
      baseInventoryUnitId: product?.baseInventoryUnitId ?? null,
      baseUnitsConsumed: product?.baseUnitsConsumed ?? null,
      additionalFields: {
        additionalInformation: (storedAdditional?.additionalInformation as
          | Record<string, unknown>
          | undefined) ?? { ...EMPTY_TIPTAP_DOC },
        productFeatures: storedAdditional?.productFeatures ?? [],
        comingSoon: storedAdditional?.comingSoon ?? false,
        productTagline: storedAdditional?.productTagline ?? "",
      },
      metaTitle: product?.metaTitle ?? "",
      metaDescription: product?.metaDescription ?? "",
      metaKeywords: product?.metaKeywords ?? "",
      ogImage: product?.ogImage ?? undefined,
      weight: product?.weight ?? undefined,
      weightUnit: (product?.weightUnit as "lb" | "kg" | undefined) ?? "lb",
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

  const ogImageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "OG image upload failed.");
    },
  });

  const galleryUploader = useUploadFiles({
    api: "/api/upload",
    route: "images",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  const slugAutoSyncs = (livePublished: boolean) =>
    !product || (!product.published && !livePublished);

  const handleNameChange = (value: string | null) => {
    if (!value) return;
    if (slugManuallyEditedRef.current) return;
    if (!slugAutoSyncs(form.getValues("published"))) return;
    form.setValue("slug", slugify(value), { shouldValidate: true });
  };

  const handleInvalidSubmit = (errors: FieldErrors<ProductFormSchema>) => {
    const first = Object.keys(errors)[0];
    if (first) setActiveTab(tabForField(first));
  };

  const revealServerErrorTab = () => {
    const first = Object.keys(form.getValues()).find(
      (name) => form.getFieldState(name as Path<ProductFormSchema>).invalid,
    );
    if (first) setActiveTab(tabForField(first));
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
      applyTrpcErrorToForm(form, error, {
        fieldMap: { slug: "slug" },
        fallbackMessage: "Failed to create product",
      });
      revealServerErrorTab();
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
      applyTrpcErrorToForm(form, error, {
        fieldMap: { slug: "slug" },
        fallbackMessage: "Failed to update product",
      });
      revealServerErrorTab();
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
    const createAnother = createAnotherRef.current;
    createAnotherRef.current = false;

    // A variant price of exactly $0 is not a real override — the storefront
    // treats 0 as "inherit the base product price" (a deliberate guard against
    // accidental $0 charges). Reject it so the owner leaves the field blank to
    // inherit, or enters a positive amount to override, rather than silently
    // getting the base price when they typed 0.
    if (variants.some((v) => v.price === 0 || v.compareAtPrice === 0)) {
      toast.error(
        "A variant price can't be $0. Leave it blank to inherit the base price, or enter an amount above $0.",
      );
      return;
    }

    // Convert price to cents
    const priceInCents = Math.round(data.price * 100);
    const compareAtPriceInCents = data.compareAtPrice
      ? Math.round(data.compareAtPrice * 100)
      : undefined;
    const costInCents = data.cost != null ? Math.round(data.cost * 100) : null;
    const skuValue = optionalTrimmed(data.sku);

    // Resolve ogImage URL: upload new file, keep existing URL, or clear
    let resolvedOgImage: string | null;
    if (ogImageFile instanceof File) {
      try {
        const response = await ogImageUploader.upload(ogImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        resolvedOgImage = fileLocation || null;
      } catch {
        toast.error("Failed to upload Open Graph image.");
        return;
      }
    } else if (ogImageRemoved) {
      resolvedOgImage = null;
    } else {
      resolvedOgImage = data.ogImage ?? null;
    }

    // Resolve gallery images: upload any pending (blob:) images before saving.
    const pendingImages = images.filter((img) => img.file);
    let resolvedImages = images.map((img, idx) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
      sortOrder: idx,
    }));
    if (pendingImages.length > 0) {
      let galleryResult;
      try {
        galleryResult = await galleryUploader.upload(
          pendingImages.map((p) => p.file!),
        );
      } catch {
        toast.error("Failed to upload images.");
        return;
      }
      if (galleryResult.failedFiles.length > 0) {
        toast.error("Some images failed to upload.");
        return;
      }
      const fileToUrl = new Map<File, string>();
      for (const f of galleryResult.files) {
        fileToUrl.set(f.raw, getStoredPath(f));
      }
      resolvedImages = images.map((img, idx) => ({
        id: img.id,
        url: img.file ? (fileToUrl.get(img.file) ?? "") : img.url,
        altText: img.altText,
        sortOrder: idx,
      }));
      if (resolvedImages.some((i) => !i.url)) {
        toast.error("Failed to resolve uploaded images.");
        return;
      }
    }

    // Variant images must point at a current gallery image. Remap any
    // pending (blob:) URLs to their uploaded URL and drop references to
    // images that were removed from the gallery.
    const resolvedUrlByFormUrl = new Map<string, string>();
    images.forEach((img, idx) => {
      const resolved = resolvedImages[idx];
      if (resolved) resolvedUrlByFormUrl.set(img.url, resolved.url);
    });
    const resolveVariantImageUrl = (url: string | null | undefined) =>
      url ? (resolvedUrlByFormUrl.get(url) ?? null) : null;

    if (product) {
      // Update existing product
      imagesToSyncRef.current = resolvedImages;

      await updateProductMutation.mutateAsync({
        id: product.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        compareAtPrice: compareAtPriceInCents,
        cost: costInCents,
        published: data.published,
        featured: data.featured,
        scheduledPublishAt:
          !data.published && data.scheduledPublishAt
            ? new Date(data.scheduledPublishAt)
            : null,
        sku: skuValue,
        trackInventory: data.trackInventory,
        allowBackorders: data.allowBackorders,
        inventoryQty: data.inventoryQty ?? 0,
        lowInventoryThreshold: data.lowInventoryThreshold ?? undefined,
        baseInventoryUnitId: data.baseInventoryUnitId ?? null,
        baseUnitsConsumed: data.baseUnitsConsumed ?? null,
        variants: variants?.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          compareAtPrice: v.compareAtPrice ?? undefined,
          inventoryQty: v.inventoryQty,
          options: v.options,
          imageUrl: resolveVariantImageUrl(v.imageUrl),
        })),
        additionalFields: {
          additionalInformation: data.additionalFields?.additionalInformation,
          productFeatures: data.additionalFields?.productFeatures ?? [],
          comingSoon: data.additionalFields?.comingSoon ?? false,
          productTagline: data.additionalFields?.productTagline ?? undefined,
        },
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords ?? null,
        ogImage: resolvedOgImage ?? null,
        weight: data.weight ?? null,
        weightUnit: data.weightUnit ?? "lb",
      });

      // New default baseline so isDirty clears (RHF only used initial defaultValues otherwise).
      form.reset(data);
      setOgImageFile(null);
      setOgImageRemoved(false);
      requestAnimationFrame(() => {
        form.reset(form.getValues());
      });

      if (product.id) {
        void syncImagesMutation.mutateAsync({
          productId: product.id,
          images: imagesToSyncRef.current,
        });

        // Sync collection memberships
        const initial = new Set(baselineCollectionIds);
        const selected = new Set(collectionIds);
        for (const id of selected) {
          if (!initial.has(id))
            await utils.client.collections.addProduct.mutate({
              collectionId: id,
              productId: product.id,
            });
        }
        for (const id of initial) {
          if (!selected.has(id))
            await utils.client.collections.removeProduct.mutate({
              collectionId: id,
              productId: product.id,
            });
        }
        setBaselineCollectionIds([...collectionIds]);
      }
    } else {
      // Create new product
      const response = await createProductMutation.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        published: data.published,
        featured: data.featured,
        scheduledPublishAt:
          !data.published && data.scheduledPublishAt
            ? new Date(data.scheduledPublishAt)
            : null,
        sku: skuValue,
        trackInventory: data.trackInventory,
        allowBackorders: data.allowBackorders,
        inventoryQty: data.inventoryQty ?? 0,
        lowInventoryThreshold: data.lowInventoryThreshold ?? undefined,
        compareAtPrice: compareAtPriceInCents,
        cost: costInCents,
        baseInventoryUnitId: data.baseInventoryUnitId ?? null,
        baseUnitsConsumed: data.baseUnitsConsumed ?? null,
        variants: variants?.map((v) => ({
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          compareAtPrice: v.compareAtPrice ?? undefined,
          inventoryQty: v.inventoryQty,
          options: v.options,
          imageUrl: resolveVariantImageUrl(v.imageUrl),
        })),
        additionalFields: {
          additionalInformation: data.additionalFields?.additionalInformation,
          productFeatures: data.additionalFields?.productFeatures ?? [],
          comingSoon: data.additionalFields?.comingSoon ?? false,
          productTagline: data.additionalFields?.productTagline ?? "",
        },
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords ?? null,
        ogImage: resolvedOgImage ?? null,
        weight: data.weight ?? null,
        weightUnit: data.weightUnit ?? "lb",
      });

      if (response.productId && resolvedImages.length > 0) {
        await syncImagesMutation.mutateAsync({
          productId: response.productId,
          images: resolvedImages.map((image) => ({
            url: image.url,
            altText: image.altText,
            sortOrder: image.sortOrder,
          })),
        });
      }

      if (response.productId && collectionIds.length > 0) {
        for (const collectionId of collectionIds) {
          await utils.client.collections.addProduct.mutate({
            collectionId,
            productId: response.productId,
          });
        }
      }

      if (response.productId) {
        if (createAnother) {
          form.reset();
          slugManuallyEditedRef.current = false;
          setImages([]);
          setVariants([]);
          setCollectionIds([]);
          setBaselineCollectionIds([]);
          setOgImageFile(null);
          setOgImageRemoved(false);
          setVariantManagerKey((k) => k + 1);
          setActiveTab("basics");
          window.scrollTo({ top: 0 });
        } else {
          router.push(`/admin/products/${response.productId}`);
        }
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
    syncImagesMutation.isPending ||
    ogImageUploader.isPending ||
    galleryUploader.isPending;

  const isDeleting = deleteProductMutation.isPending;

  const isCollectionsDirty = useMemo(() => {
    const initial = new Set(baselineCollectionIds);
    const current = new Set(collectionIds);
    if (initial.size !== current.size) return true;
    for (const id of current) if (!initial.has(id)) return true;
    return false;
  }, [collectionIds, baselineCollectionIds]);

  const isOgImageDirty = ogImageFile !== null || ogImageRemoved;
  const isDirty =
    form.formState.isDirty ||
    isImagesDirty ||
    isCollectionsDirty ||
    isOgImageDirty;

  useKeyboardEnter(form, onSubmit, handleInvalidSubmit);
  useDirtyForm(isDirty);

  const { errors: formErrors, isSubmitted: saveAttempted } = form.formState;
  const erroredTabs = useMemo(
    () =>
      saveAttempted
        ? erroredTabsFor(formErrors, tabForField)
        : new Set<ProductFormTab>(),
    [saveAttempted, formErrors],
  );

  // SEO preview values — || is intentional so empty string falls back to the default
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const seoPreviewTitle =
    form.watch("metaTitle") || form.watch("name") || "Product Name";
  const seoPreviewDesc =
    form.watch("metaDescription") ||
    form.watch("description") ||
    "Your product description will appear here in search results.";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  const watchedName = form.watch("name") ?? "";
  const watchedSlug = form.watch("slug") ?? "";
  const nameDerivedSlug = slugify(watchedName);
  const slugFrozen = !slugAutoSyncs(form.watch("published"));
  const showBasicsRenameWarning =
    slugFrozen &&
    !!product &&
    watchedName.trim() !== product.name &&
    nameDerivedSlug !== watchedSlug;

  const watchedPrice = form.watch("price");
  const watchedCost = form.watch("cost");
  const marginPercent =
    variants.length === 0 &&
    typeof watchedCost === "number" &&
    watchedCost > 0 &&
    typeof watchedPrice === "number" &&
    watchedPrice > 0
      ? Math.round(((watchedPrice - watchedCost) / watchedPrice) * 100)
      : null;

  const shippingType = businessInfo?.shippingType;
  const shippingWeightInert = !!shippingType && shippingType !== "zone_weight";
  const shippingModeLabel =
    (shippingType ? SHIPPING_MODE_LABELS[shippingType] : undefined) ??
    "your current shipping mode";
  const showWeightFields = !shippingWeightInert || showWeightAnyway;
  const storeDefaultWeightLb = businessInfo?.shippingDefaultItemWeightLb;
  const weightDescription =
    typeof storeDefaultWeightLb === "number" && storeDefaultWeightLb > 0
      ? `Leave blank to use the store default (${storeDefaultWeightLb} lb).`
      : "Leave blank to use the store default.";

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) =>
            void form.handleSubmit(onSubmit, handleInvalidSubmit)(e)
          }
          className="bg-muted min-h-screen"
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
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="hidden truncate text-base font-medium sm:block">
                  {product
                    ? form.watch("name") || "Edit Product"
                    : "New Product"}
                </h1>

                <span
                  className={cn(
                    `admin-status-badge`,
                    `${
                      isDirty ? "isDirty" : "isPublished"
                    } ${!product?.id ? "isNew" : ""}`,
                  )}
                >
                  {isDirty
                    ? "Unsaved Changes"
                    : !product?.id
                      ? "Draft"
                      : "Saved"}
                </span>
              </div>
            </div>

            <div className="toolbar-actions">
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor="published" className="text-sm">
                      Published
                    </Label>
                    <Switch
                      id="published"
                      aria-label="Published"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="ml-2 sr-only sm:not-sr-only">
                      More Options
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {product?.id && product.published && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/shop/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View on storefront (opens in new tab)"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on storefront
                      </a>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    disabled={isSubmitting || !isDirty}
                    onClick={() => {
                      form.reset();
                      slugManuallyEditedRef.current = false;
                      setCollectionIds(baselineCollectionIds);
                      setOgImageFile(null);
                      setOgImageRemoved(false);
                      if (ogImageFileInputRef.current)
                        ogImageFileInputRef.current.value = "";
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </DropdownMenuItem>

                  {product && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isSubmitting}
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {!product && (
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    createAnotherRef.current = true;
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="saving-indicator" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">
                        Save &amp; create another
                      </span>
                      <span className="sm:hidden">Save+</span>
                    </>
                  )}
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

          <div className="admin-container">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as ProductFormTab)}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="basics">
                  Basics
                  {erroredTabs.has("basics") && <TabErrorDot />}
                </TabsTrigger>
                {collectionsEnabled && (
                  <TabsTrigger value="collections">Collections</TabsTrigger>
                )}
                <TabsTrigger value="seo">
                  SEO
                  {erroredTabs.has("seo") && <TabErrorDot />}
                </TabsTrigger>
                <TabsTrigger value="additional">
                  Product page
                  {erroredTabs.has("additional") && <TabErrorDot />}
                </TabsTrigger>
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

                        {showBasicsRenameWarning ? (
                          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                Name changed — the URL hasn&apos;t.
                              </p>
                              <p className="text-amber-700">
                                This product is still at{" "}
                                <span className="font-mono">
                                  /shop/{watchedSlug}
                                </span>
                                . Updating the URL to match will 404 old links,
                                bookmarks, search results, and saved wishlists.
                                We don&apos;t create a redirect automatically.
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  slugManuallyEditedRef.current = true;
                                  form.setValue("slug", nameDerivedSlug, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  });
                                  setActiveTab("seo");
                                }}
                              >
                                Update URL
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                            <span>
                              Storefront URL:{" "}
                              <span className="font-mono">
                                /shop/{watchedSlug || "your-product"}
                              </span>
                            </span>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => setActiveTab("seo")}
                            >
                              Edit in SEO
                            </Button>
                          </div>
                        )}

                        <TextareaFormField
                          form={form}
                          name="description"
                          label="Description"
                          placeholder="Describe your product..."
                          rows={4}
                        />

                        {/* Schedule publish (only while unpublished) */}
                        {!form.watch("published") && (
                          <FormField
                            control={form.control}
                            name="scheduledPublishAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Schedule publish</FormLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    className="w-auto"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {field.value
                                    ? `Scheduled for ${new Date(field.value).toLocaleString()}`
                                    : "Optional — publish this product automatically at a future date and time."}
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}
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
                      <CardContent className="space-y-4">
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
                                  <FormLabel>Price</FormLabel>
                                  <FormControl>
                                    <MoneyInput
                                      placeholder="19.99"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Base price in USD (variant prices can
                                    override this)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="compareAtPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Compare at price</FormLabel>
                                  <FormControl>
                                    <MoneyInput
                                      placeholder="24.99"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Original price shown crossed out. Leave
                                    blank to disable the sale display.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between gap-2">
                                <FormLabel>Cost per item</FormLabel>
                                {marginPercent !== null && (
                                  <span className="text-muted-foreground text-xs tabular-nums">
                                    {marginPercent}% margin
                                  </span>
                                )}
                              </div>
                              <FormControl>
                                <MoneyInput placeholder="0.00" {...field} />
                              </FormControl>
                              <FormDescription>
                                What you pay for this item. Never shown to
                                customers.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                    {/* Shipping weight */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Shipping weight</CardTitle>
                        <CardDescription>
                          Used to calculate shipping rates when zone + weight
                          pricing is active
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {showWeightFields ? (
                          <FormField
                            control={form.control}
                            name="weight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Package weight</FormLabel>
                                <InputGroup>
                                  <FormControl>
                                    <InputGroupNumberInput
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      value={field.value ?? undefined}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <InputGroupAddon
                                    align="inline-end"
                                    className="py-0 pr-1"
                                  >
                                    <FormField
                                      control={form.control}
                                      name="weightUnit"
                                      render={({ field: unitField }) => (
                                        <Select
                                          onValueChange={unitField.onChange}
                                          value={unitField.value ?? "lb"}
                                        >
                                          <SelectTrigger
                                            size="sm"
                                            aria-label="Weight unit"
                                            className="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="lb">
                                              lb
                                            </SelectItem>
                                            <SelectItem value="kg">
                                              kg
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
                                    />
                                  </InputGroupAddon>
                                </InputGroup>
                                <FormDescription>
                                  {weightDescription}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div className="space-y-2">
                            <p className="text-muted-foreground text-sm">
                              Your store is on {shippingModeLabel}, so package
                              weight doesn&apos;t affect what customers are
                              charged.{" "}
                              <Link
                                href="/admin/settings/shipping"
                                className="text-foreground underline"
                              >
                                Shipping settings
                              </Link>
                            </p>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-sm"
                              onClick={() => setShowWeightAnyway(true)}
                            >
                              Set a weight anyway
                            </Button>
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
                        {variants.length > 0 ? (
                          <p className="text-muted-foreground text-sm">
                            SKU is set per variant below.
                          </p>
                        ) : (
                          <InputFormField
                            form={form}
                            name="sku"
                            label="SKU"
                            placeholder="e.g., TSHIRT-WHT-M"
                            description="Your own stock-keeping code. Used to match rows when importing inventory."
                          />
                        )}

                        {/* Base Unit pool selector (shown when pools exist and no variants) */}
                        {pools.length > 0 && variants.length === 0 && (
                          <div className="space-y-3 rounded-lg border p-4">
                            <div>
                              <Label className="text-sm font-medium">
                                Base Unit
                              </Label>
                              <p className="text-muted-foreground mt-0.5 text-sm">
                                Link this product to a shared inventory pool.
                                For example, if your base unit is a
                                &ldquo;4-pack Roll&rdquo; and this product is a
                                24-pack, set units consumed to 6.
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="baseInventoryUnitId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pool</FormLabel>
                                  <Select
                                    onValueChange={(val) =>
                                      field.onChange(
                                        val === "__none__" ? null : val,
                                      )
                                    }
                                    value={field.value ?? "__none__"}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="None — use individual inventory" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="__none__">
                                        None — use individual inventory
                                      </SelectItem>
                                      {pools.map((pool) => (
                                        <SelectItem
                                          key={pool.id}
                                          value={pool.id}
                                        >
                                          {pool.name} ({pool.inventoryQty}{" "}
                                          units)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            {form.watch("baseInventoryUnitId") && (
                              <FormField
                                control={form.control}
                                name="baseUnitsConsumed"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Units consumed per purchase
                                    </FormLabel>
                                    <FormControl>
                                      <NumberInput
                                        step="1"
                                        min="1"
                                        placeholder="e.g. 6"
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      How many base units this product uses per
                                      item sold.
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        )}

                        {/* Individual inventory controls — hidden when pool is selected */}
                        {!form.watch("baseInventoryUnitId") && (
                          <>
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
                                    <FormLabel>
                                      Low Inventory Threshold
                                    </FormLabel>
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
                          </>
                        )}

                        {/* Informational note when pool is active */}
                        {form.watch("baseInventoryUnitId") && (
                          <p className="text-muted-foreground text-sm">
                            Individual inventory tracking is disabled while a
                            base unit pool is selected. Manage pool stock from
                            the{" "}
                            <Link href="/admin/inventory" className="underline">
                              Inventory
                            </Link>{" "}
                            page.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Variants */}
                <VariantManager
                  key={variantManagerKey}
                  variants={variants}
                  onChange={setVariants}
                  trackInventory={form.watch("trackInventory")}
                  basePrice={Math.round((form.watch("price") || 0) * 100)}
                  existingVariantOptions={getExistingVariantOptions(
                    product?.variants as
                      | Array<{ options: Record<string, string> }>
                      | undefined,
                  )}
                  images={images}
                />
              </TabsContent>

              {collectionsEnabled && (
                <TabsContent value="collections" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Collections</CardTitle>
                      <CardDescription>
                        Assign this product to one or more collections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {allCollections.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No collections yet.{" "}
                          <Link
                            href="/admin/collections/new"
                            className="underline"
                          >
                            Create one
                          </Link>{" "}
                          to get started.
                        </p>
                      ) : (
                        <>
                          {collectionIds.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                              {collectionIds
                                .map((id) =>
                                  allCollections.find((c) => c.id === id),
                                )
                                .filter(
                                  (c): c is NonNullable<typeof c> =>
                                    c !== undefined,
                                )
                                .map((collection) => (
                                  <Badge
                                    key={collection.id}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                  >
                                    <span className="max-w-[160px] truncate">
                                      {collection.name}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${collection.name}`}
                                      className="focus-visible:ring-ring ml-0.5 rounded-full hover:bg-black/10 focus-visible:ring-1 focus-visible:outline-none"
                                      onClick={() =>
                                        setCollectionIds((prev) =>
                                          prev.filter(
                                            (id) => id !== collection.id,
                                          ),
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                            </div>
                          )}

                          <div className="relative mb-3">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                              type="search"
                              placeholder="Search collections..."
                              aria-label="Search collections"
                              value={collectionSearch}
                              onChange={(e) =>
                                setCollectionSearch(e.target.value)
                              }
                              className="pl-10"
                            />
                          </div>

                          <ScrollArea className="h-72 min-h-0 overflow-hidden">
                            <div className="space-y-2">
                              {(() => {
                                const filtered = collectionSearch.trim()
                                  ? allCollections.filter((c) =>
                                      c.name
                                        .toLowerCase()
                                        .includes(
                                          collectionSearch.toLowerCase().trim(),
                                        ),
                                    )
                                  : allCollections;

                                if (filtered.length === 0) {
                                  return (
                                    <p className="text-muted-foreground py-6 text-center text-sm">
                                      No collections match &ldquo;
                                      {collectionSearch}&rdquo;
                                    </p>
                                  );
                                }

                                return filtered.map((collection) => (
                                  <label
                                    key={collection.id}
                                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded border p-3"
                                  >
                                    <Checkbox
                                      className="shrink-0"
                                      aria-label={collection.name}
                                      checked={collectionIds.includes(
                                        collection.id,
                                      )}
                                      onCheckedChange={() =>
                                        setCollectionIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(collection.id))
                                            next.delete(collection.id);
                                          else next.add(collection.id);
                                          return [...next];
                                        })
                                      }
                                    />
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {collection.name}
                                      </p>
                                      <p className="text-muted-foreground text-sm">
                                        {collection._count.collectionProducts}{" "}
                                        product
                                        {collection._count
                                          .collectionProducts !== 1
                                          ? "s"
                                          : ""}
                                      </p>
                                    </div>
                                  </label>
                                ));
                              })()}
                            </div>
                          </ScrollArea>

                          <p className="text-muted-foreground mt-4 text-sm">
                            {collectionIds.length} collection
                            {collectionIds.length !== 1 ? "s" : ""} selected
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="seo" className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Meta Tags</CardTitle>
                        <CardDescription>
                          Override how this product appears in search engine
                          results
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <InputFormField
                          form={form}
                          name="slug"
                          label="URL Slug"
                          placeholder="classic-white-t-shirt"
                          onChange={(value) => {
                            slugManuallyEditedRef.current = true;
                            form.setValue("slug", sanitizeSlugInput(value), {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          required
                          description={`Used in the product URL: /shop/${watchedSlug || "your-product"}`}
                        />

                        {product?.id && watchedSlug !== product.slug && (
                          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                Heads up — this will change the product&apos;s
                                URL.
                              </p>
                              <p className="text-amber-700">
                                Saving will change the public URL from{" "}
                                <span className="font-mono">
                                  /shop/{product.slug}
                                </span>{" "}
                                to{" "}
                                <span className="font-mono">
                                  /shop/{watchedSlug}
                                </span>
                                . Anyone with the old link — including
                                bookmarks, search engines, and saved wishlists —
                                will get a 404. We don&apos;t set up a redirect
                                automatically.
                              </p>
                            </div>
                          </div>
                        )}

                        <InputFormField
                          form={form}
                          name="metaTitle"
                          label="Meta Title"
                          placeholder={
                            form.watch("name") || "e.g., Classic White T-Shirt"
                          }
                          description={`${form.watch("metaTitle")?.length ?? 0}/60 characters — leave blank to use product name`}
                          descriptionClassName="text-xs text-muted-foreground"
                        />

                        <TextareaFormField
                          form={form}
                          name="metaDescription"
                          label="Meta Description"
                          placeholder={
                            form.watch("description") ??
                            "e.g., Soft, breathable cotton tee perfect for everyday wear."
                          }
                          description={`${form.watch("metaDescription")?.length ?? 0}/160 characters — leave blank to use product description`}
                          descriptionClassName="text-xs text-muted-foreground"
                          rows={3}
                        />

                        <InputFormField
                          form={form}
                          name="metaKeywords"
                          label="Meta Keywords"
                          placeholder="e.g., t-shirt, cotton, classic, white"
                          description="Comma-separated keywords"
                          descriptionClassName="text-xs text-muted-foreground"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Open Graph Image</CardTitle>
                        <CardDescription>
                          Shown when this product is shared on social media.
                          Recommended: 1200×630px.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <OgImageUploader
                          file={ogImageFile}
                          existingUrl={
                            ogImageRemoved
                              ? undefined
                              : (product?.ogImage ?? undefined)
                          }
                          fileInputRef={ogImageFileInputRef}
                          onFileChange={(f) => {
                            setOgImageFile(f);
                            setOgImageRemoved(false);
                          }}
                          onRemove={() => {
                            setOgImageFile(null);
                            setOgImageRemoved(true);
                          }}
                          disabled={isSubmitting}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Search Result Preview</CardTitle>
                        <CardDescription>
                          How this product might appear in Google
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SearchResultPreview
                          host={siteHost}
                          pathPrefix="/shop"
                          slug={watchedSlug || "product-slug"}
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Social Media Preview</CardTitle>
                        <CardDescription>
                          How this product looks when shared on social platforms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SocialPreviewCard
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                          ogImageFile={ogImageFile}
                          existingOgImage={
                            ogImageRemoved
                              ? undefined
                              : (product?.ogImage ?? undefined)
                          }
                          siteHost={siteHost}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
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

                      <SwitchFormField
                        form={form}
                        name="featured"
                        label="Featured"
                        description="On templates that support it, featured products sort first and show a badge."
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
