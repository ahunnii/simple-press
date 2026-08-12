"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useUploadFile } from "@better-upload/client";
import {
  ChevronDown,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ServiceAddOn, ServicePriceTier } from "~/lib/validators/services";
import type { RouterOutputs } from "~/trpc/react";
import { isCategoryAwareServiceTemplate } from "~/lib/service-templates";
import { cn } from "~/lib/utils";
import { serviceItemFormSchema } from "~/lib/validators/services";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";

type ServiceItem = RouterOutputs["services"]["getById"]["items"][number];

type SectionRow = { _id?: string; label?: unknown; [k: string]: unknown };

/** Coerce an unknown section-row label to a string. */
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

type Props = {
  serviceId: string;
  items: ServiceItem[];
  serviceTemplateId: string;
  sections: SectionRow[];
  /** Whether the `embeds` feature flag is on for this business. */
  embedsEnabled?: boolean;
};

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableItemRow({
  item,
  onEdit,
  onDelete,
  sectionLabel,
}: {
  item: ServiceItem;
  onEdit: (item: ServiceItem) => void;
  onDelete: (id: string) => void;
  sectionLabel?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded-lg border p-3"
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

      {item.image ? (
        <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="bg-muted h-10 w-10 shrink-0 rounded" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          {!item.published && (
            <Badge variant="secondary" className="text-xs">
              Draft
            </Badge>
          )}
          {sectionLabel && (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              {sectionLabel}
            </Badge>
          )}
          {item.priceLabel && (
            <span className="text-muted-foreground text-xs">
              {item.priceLabel}
            </span>
          )}
          {item.durationLabel && (
            <span className="text-muted-foreground text-xs">
              · {item.durationLabel}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {item.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="text-destructive hover:text-destructive/80"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Item Form (in Dialog) ────────────────────────────────────────────────────

const SECTION_NONE = "__none__";

function ServiceItemFormDialog({
  serviceId,
  item,
  open,
  onOpenChange,
  onSuccess,
  categoryAware,
  sections,
  embedsEnabled,
}: {
  serviceId: string;
  item?: ServiceItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categoryAware: boolean;
  sections: SectionRow[];
  embedsEnabled?: boolean;
}) {
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  // URLs uploaded to S3 during the in-flight submit that aren't yet persisted
  // to the DB. Populated right before addItem/updateItem is called (those are
  // fire-and-forget `mutate`, not `mutateAsync`) so the mutation's onError can
  // discard them if the save itself fails — otherwise they'd be orphaned in
  // S3 forever. Mirrors the pattern in collection-form.tsx.
  const pendingUploadUrlsRef = useRef<string[]>([]);

  const [tiersOpen, setTiersOpen] = useState(false);
  const [addOnsOpen, setAddOnsOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  const form = useForm<z.input<typeof serviceItemFormSchema>>({
    resolver: zodResolver(serviceItemFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: item?.name ?? "",
      description: item?.description ?? "",
      image: item?.image ?? undefined,
      imageFile: undefined,
      priceLabel: item?.priceLabel ?? "",
      compareAtPriceLabel: item?.compareAtPriceLabel ?? "",
      durationLabel: item?.durationLabel ?? "",
      priceTiers: (item?.priceTiers as ServicePriceTier[] | null) ?? [],
      addOns: (item?.addOns as ServiceAddOn[] | null) ?? [],
      bookingEmbedSrc: item?.bookingEmbedSrc ?? "",
      bookingEmbedHeight: item?.bookingEmbedHeight ?? undefined,
      published: item?.published ?? true,
      isSignature: item?.isSignature ?? false,
      category: item?.category ?? SECTION_NONE,
    },
  });

  // The dialog stays mounted across edits, so re-seed the form whenever it
  // opens for a different item (or for "Add"). Without this, fields show stale
  // values from the previously edited item.
  useEffect(() => {
    if (!open) return;
    const priceTiers = (item?.priceTiers as ServicePriceTier[] | null) ?? [];
    const addOns = (item?.addOns as ServiceAddOn[] | null) ?? [];
    form.reset({
      name: item?.name ?? "",
      description: item?.description ?? "",
      image: item?.image ?? undefined,
      imageFile: undefined,
      priceLabel: item?.priceLabel ?? "",
      compareAtPriceLabel: item?.compareAtPriceLabel ?? "",
      durationLabel: item?.durationLabel ?? "",
      priceTiers,
      addOns,
      bookingEmbedSrc: item?.bookingEmbedSrc ?? "",
      bookingEmbedHeight: item?.bookingEmbedHeight ?? undefined,
      published: item?.published ?? true,
      isSignature: item?.isSignature ?? false,
      category: item?.category ?? SECTION_NONE,
    });
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    pendingUploadUrlsRef.current = [];
    // Auto-expand any advanced section that already has data — collapsing
    // populated data out of sight on an edit would be worse than the
    // dialog's previous tallness. Both start closed for "Add".
    setTiersOpen(priceTiers.length > 0);
    setAddOnsOpen(addOns.length > 0);
    setEmbedOpen(Boolean(item?.bookingEmbedSrc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({ control: form.control, name: "priceTiers" });

  const {
    fields: addOnFields,
    append: appendAddOn,
    remove: removeAddOn,
  } = useFieldArray({ control: form.control, name: "addOns" });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  // Best-effort S3 cleanup for uploads whose parent save step failed. Not
  // user-visible or blocking — the caller's own error path already completed.
  const discardUploadsMutation = api.upload.discardUploads.useMutation({
    onError: (err, variables) => {
      console.warn(
        "Failed to discard uploaded files; objects may be orphaned in S3:",
        variables.urls,
        err,
      );
    },
  });

  const discardPendingUploads = () => {
    const urls = pendingUploadUrlsRef.current;
    pendingUploadUrlsRef.current = [];
    if (urls.length > 0) {
      discardUploadsMutation.mutate({ urls });
    }
  };

  const addMutation = api.services.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      // Upload from this submit is now persisted (referenced by the new
      // item) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      form.reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      discardPendingUploads();
      toast.error(err.message ?? "Failed to add item");
    },
  });

  const updateMutation = api.services.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      // Upload from this submit is now persisted (referenced by the updated
      // item) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      discardPendingUploads();
      toast.error(err.message ?? "Failed to update item");
    },
  });

  const onSubmit = async (data: z.input<typeof serviceItemFormSchema>) => {
    // Normalize the "no section" sentinel to null so the DB column is cleared.
    const category = categoryAware
      ? data.category === SECTION_NONE || !data.category
        ? null
        : data.category
      : undefined;

    // Resolve the image: upload a newly-picked File now (the dialog is
    // cancellable, so uploads are deferred until submit — never on pick),
    // pass through null if the existing image was explicitly removed, or
    // fall back to the unchanged existing URL.
    let image: string | null | undefined;
    const imageFile = data.imageFile;
    if (imageFile === null) {
      image = null;
    } else if (imageFile instanceof File) {
      try {
        const response = await imageUploader.upload(imageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          image = fileLocation;
          pendingUploadUrlsRef.current = [fileLocation];
        }
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      image = data.image;
    }

    if (item?.id) {
      updateMutation.mutate({
        id: item.id,
        name: data.name,
        description: data.description,
        image,
        priceLabel: data.priceLabel,
        compareAtPriceLabel: data.compareAtPriceLabel,
        durationLabel: data.durationLabel,
        priceTiers: data.priceTiers,
        addOns: data.addOns,
        bookingEmbedSrc: data.bookingEmbedSrc,
        bookingEmbedHeight: data.bookingEmbedHeight,
        published: data.published ?? false,
        category,
      });
    } else {
      addMutation.mutate({
        serviceId,
        name: data.name,
        description: data.description,
        image,
        priceLabel: data.priceLabel,
        compareAtPriceLabel: data.compareAtPriceLabel,
        durationLabel: data.durationLabel,
        priceTiers: data.priceTiers,
        addOns: data.addOns,
        bookingEmbedSrc: data.bookingEmbedSrc,
        bookingEmbedHeight: data.bookingEmbedHeight,
        published: data.published ?? false,
        category,
      });
    }
  };

  const isPending =
    addMutation.isPending || updateMutation.isPending || imageUploader.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit service item" : "Add service item"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details for this specific service offering.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {/* Left column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Name{" "}
                        <span className="text-destructive" aria-hidden="true">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Signature Facial"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {categoryAware && (
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) =>
                      sections.length === 0 ? (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <p className="text-muted-foreground text-sm">
                            Define sections in the Page content tab first,
                            then assign items here.
                          </p>
                        </FormItem>
                      ) : (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <Select
                            value={field.value ?? SECTION_NONE}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="No section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={SECTION_NONE}>
                                No section
                              </SelectItem>
                              {sections.map((s) => (
                                <SelectItem
                                  key={s._id ?? asStr(s.label)}
                                  value={s._id ?? ""}
                                >
                                  {asStr(s.label) || "Untitled section"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )
                    }
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe this specific service…"
                          rows={3}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ImageUploadFormField
                  form={form}
                  name="imageFile"
                  label="Image"
                  existingPreviewUrl={item?.image ?? undefined}
                  inputRef={imageFileInputRef}
                  disabled={isPending}
                />
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="priceLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. $85"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compareAtPriceLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Was / compare-at price</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. $120 (was)"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 60 min"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <Switch
                          id="item-published"
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="item-published">Published</Label>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isSignature"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <Switch
                          id="item-is-signature"
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                        <div>
                          <Label htmlFor="item-is-signature">
                            Signature offering
                          </Label>
                          <p className="text-muted-foreground text-xs">
                            Spotlight this as the flagship treatment.
                          </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced sections — collapsed by default, auto-expanded when
                the item already has data so editing never hides it. */}
            <div className="space-y-2">
              <Collapsible
                open={tiersOpen}
                onOpenChange={setTiersOpen}
                className="border-border rounded-lg border"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="focus-visible:ring-ring flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium focus-visible:ring-1 focus-visible:outline-none"
                  >
                    <span>Price options ({tierFields.length})</span>
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                        tiersOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-border space-y-3 border-t p-3">
                  <p className="text-muted-foreground text-xs">
                    Alternate prices for different groups (membership, annual,
                    etc.).
                  </p>

                  {tierFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border-border bg-muted/50 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end"
                    >
                      <FormField
                        control={form.control}
                        name={`priceTiers.${index}.label`}
                        render={({ field: f }) => (
                          <FormItem className="min-w-0 flex-1">
                            <FormLabel className="text-muted-foreground text-xs">
                              Label
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Members" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`priceTiers.${index}.priceLabel`}
                        render={({ field: f }) => (
                          <FormItem className="min-w-0 flex-1">
                            <FormLabel className="text-muted-foreground text-xs">
                              Price
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. $70" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`priceTiers.${index}.compareAtPriceLabel`}
                        render={({ field: f }) => (
                          <FormItem className="min-w-0 flex-1">
                            <FormLabel className="text-muted-foreground text-xs">
                              Was (optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. $90"
                                value={f.value ?? ""}
                                onChange={f.onChange}
                                onBlur={f.onBlur}
                                name={f.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 shrink-0"
                        aria-label="Remove price tier"
                        onClick={() => removeTier(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {tierFields.length < 8 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendTier({
                          label: "",
                          priceLabel: "",
                          compareAtPriceLabel: "",
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add tier
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible
                open={addOnsOpen}
                onOpenChange={setAddOnsOpen}
                className="border-border rounded-lg border"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="focus-visible:ring-ring flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium focus-visible:ring-1 focus-visible:outline-none"
                  >
                    <span>Add-ons ({addOnFields.length})</span>
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                        addOnsOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-border space-y-3 border-t p-3">
                  <p className="text-muted-foreground text-xs">
                    Optional extras shown under this service.
                  </p>

                  {addOnFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border-border bg-muted/50 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end"
                    >
                      <FormField
                        control={form.control}
                        name={`addOns.${index}.name`}
                        render={({ field: f }) => (
                          <FormItem className="min-w-0 flex-[2]">
                            <FormLabel className="text-muted-foreground text-xs">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Hot stones" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`addOns.${index}.priceLabel`}
                        render={({ field: f }) => (
                          <FormItem className="min-w-0 flex-1">
                            <FormLabel className="text-muted-foreground text-xs">
                              Price
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. +$20"
                                value={f.value ?? ""}
                                onChange={f.onChange}
                                onBlur={f.onBlur}
                                name={f.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`addOns.${index}.description`}
                        render={({ field: f }) => (
                          <FormItem className="min-w-0 flex-[2]">
                            <FormLabel className="text-muted-foreground text-xs">
                              Description
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Optional"
                                value={f.value ?? ""}
                                onChange={f.onChange}
                                onBlur={f.onBlur}
                                name={f.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 shrink-0"
                        aria-label="Remove add-on"
                        onClick={() => removeAddOn(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {addOnFields.length < 12 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendAddOn({
                          name: "",
                          priceLabel: "",
                          description: "",
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add add-on
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible
                open={embedOpen}
                onOpenChange={setEmbedOpen}
                className="border-border rounded-lg border"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="focus-visible:ring-ring flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium focus-visible:ring-1 focus-visible:outline-none"
                  >
                    <span>Booking embed</span>
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                        embedOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-border space-y-4 border-t p-3">
                  {embedsEnabled ? (
                    <>
                      <FormField
                        control={form.control}
                        name="bookingEmbedSrc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Booking embed (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                                placeholder="https://vagaro.com/... or paste an <iframe> snippet"
                                rows={3}
                              />
                            </FormControl>
                            <p className="text-muted-foreground text-xs">
                              Paste a direct booking URL (Vagaro, Mindbody,
                              etc.) or a full{" "}
                              <code className="bg-muted rounded px-0.5 font-mono text-[11px]">
                                &lt;iframe&gt;
                              </code>{" "}
                              embed code. The server will sanitize and extract
                              the src. Must be HTTPS.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bookingEmbedHeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Embed height (px)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={100}
                                max={2000}
                                placeholder="600"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  field.onChange(
                                    e.target.value === ""
                                      ? undefined
                                      : Number.isFinite(n) && n > 0
                                        ? n
                                        : field.value,
                                  );
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                      Embeds are disabled for this business. Enable the
                      Embeds feature in <strong>Settings → Features</strong>.
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : item ? "Update item" : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function ServiceItemsEditor({
  serviceId,
  items: initialItems,
  serviceTemplateId,
  sections,
  embedsEnabled,
}: Props) {
  const categoryAware = isCategoryAwareServiceTemplate(serviceTemplateId);
  const utils = api.useUtils();
  const router = useRouter();

  const [items, setItems] = useState<ServiceItem[]>(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Re-sync local state when the server page hands down fresh data after
  // router.refresh() (e.g. an added/edited item). Without this, useState only
  // reads initialItems on first render, so new items don't appear until a full
  // page reload. Delete/reorder mutate `items` directly, so this is a no-op for
  // them once the server prop catches up.
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reorderMutation = api.services.reorderItems.useMutation({
    onError: () => {
      toast.error("Failed to save new order");
      void utils.services.invalidate();
    },
  });

  const deleteMutation = api.services.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      void utils.services.invalidate();
      router.refresh();
    },
    onError: (err) => toast.error(err.message ?? "Failed to delete item"),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    reorderMutation.mutate({
      serviceId,
      ids: reordered.map((i) => i.id),
    });
  };

  const handleEditSuccess = () => {
    void utils.services.invalidate();
    router.refresh();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate({ id: deleteId });
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Specific Services</CardTitle>
            <CardDescription>
              Add the individual services within this group (e.g. specific wax
              types, facial packages).
              {embedsEnabled && " Each can have a booking embed."}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingItem(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No service items yet. Add the first one.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingItem(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add first item
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item) => {
                  const sectionLabel = categoryAware
                    ? asStr(
                        sections.find((s) => s._id === item.category)?.label,
                      )
                    : "";
                  return (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      onEdit={(i) => {
                        setEditingItem(i);
                        setDialogOpen(true);
                      }}
                      onDelete={(id) => setDeleteId(id)}
                      sectionLabel={sectionLabel || undefined}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Add/Edit dialog */}
      <ServiceItemFormDialog
        serviceId={serviceId}
        item={editingItem}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingItem(undefined);
        }}
        onSuccess={handleEditSuccess}
        categoryAware={categoryAware}
        sections={sections}
        embedsEnabled={embedsEnabled}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this service item. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
