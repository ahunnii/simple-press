"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { z } from "zod";
import { useEffect, useState } from "react";
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
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type ServiceItem = RouterOutputs["services"]["getById"]["items"][number];

type Props = {
  serviceId: string;
  items: ServiceItem[];
};

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ServiceItem;
  onEdit: (item: ServiceItem) => void;
  onDelete: (id: string) => void;
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
      className="flex items-center gap-3 rounded-lg border bg-white p-3"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="focus-visible:ring-ring flex h-9 w-9 cursor-move items-center justify-center text-gray-400 hover:text-gray-600 focus-visible:ring-1 focus-visible:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {item.image ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded bg-gray-100" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          {!item.published && (
            <Badge variant="secondary" className="text-xs">
              Draft
            </Badge>
          )}
          {item.priceLabel && (
            <span className="text-xs text-gray-500">{item.priceLabel}</span>
          )}
          {item.durationLabel && (
            <span className="text-xs text-gray-500">
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
          className="text-red-500 hover:text-red-700"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Item Form (in Dialog) ────────────────────────────────────────────────────

function ServiceItemFormDialog({
  serviceId,
  item,
  open,
  onOpenChange,
  onSuccess,
}: {
  serviceId: string;
  item?: ServiceItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<z.input<typeof serviceItemFormSchema>>({
    resolver: zodResolver(serviceItemFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: item?.name ?? "",
      description: item?.description ?? "",
      image: item?.image ?? undefined,
      priceLabel: item?.priceLabel ?? "",
      durationLabel: item?.durationLabel ?? "",
      bookingEmbedSrc: item?.bookingEmbedSrc ?? "",
      bookingEmbedHeight: item?.bookingEmbedHeight ?? undefined,
      published: item?.published ?? true,
    },
  });

  // The dialog stays mounted across edits, so re-seed the form whenever it
  // opens for a different item (or for "Add"). Without this, fields show stale
  // values from the previously edited item.
  useEffect(() => {
    if (!open) return;
    form.reset({
      name: item?.name ?? "",
      description: item?.description ?? "",
      image: item?.image ?? undefined,
      priceLabel: item?.priceLabel ?? "",
      durationLabel: item?.durationLabel ?? "",
      bookingEmbedSrc: item?.bookingEmbedSrc ?? "",
      bookingEmbedHeight: item?.bookingEmbedHeight ?? undefined,
      published: item?.published ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const addMutation = api.services.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      form.reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message ?? "Failed to add item"),
  });

  const updateMutation = api.services.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message ?? "Failed to update item"),
  });

  const onSubmit = (data: z.input<typeof serviceItemFormSchema>) => {
    if (item?.id) {
      updateMutation.mutate({
        id: item.id,
        name: data.name,
        description: data.description,
        image: data.image,
        priceLabel: data.priceLabel,
        durationLabel: data.durationLabel,
        bookingEmbedSrc: data.bookingEmbedSrc,
        bookingEmbedHeight: data.bookingEmbedHeight,
        published: data.published ?? false,
      });
    } else {
      addMutation.mutate({
        serviceId,
        name: data.name,
        description: data.description,
        image: data.image,
        priceLabel: data.priceLabel,
        durationLabel: data.durationLabel,
        bookingEmbedSrc: data.bookingEmbedSrc,
        bookingEmbedHeight: data.bookingEmbedHeight,
        published: data.published ?? false,
      });
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
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
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name{" "}
                    <span className="text-red-500" aria-hidden="true">
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Signature Facial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Booking embed */}
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
                    Paste a direct booking URL (Vagaro, Mindbody, etc.) or a
                    full{" "}
                    <code className="bg-muted rounded px-0.5 font-mono text-[11px]">
                      &lt;iframe&gt;
                    </code>{" "}
                    embed code. The server will sanitize and extract the src.
                    Must be HTTPS.
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

export function ServiceItemsEditor({ serviceId, items: initialItems }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  const [items, setItems] = useState<ServiceItem[]>(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
              types, facial packages). Each can have a booking embed.
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
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <p className="mb-4 text-gray-500">
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
                {items.map((item) => (
                  <SortableItemRow
                    key={item.id}
                    item={item}
                    onEdit={(i) => {
                      setEditingItem(i);
                      setDialogOpen(true);
                    }}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
