"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { RouterOutputs } from "~/trpc/react";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";

type Item = RouterOutputs["baseInventoryUnit"]["items"]["items"][number];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  inventoryQty: z.coerce.number().int().min(0),
  lowInventoryThreshold: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  itemType: z.enum(["stock", "rental"]),
  sku: z.string().max(64).optional(),
  category: z.string().max(100).optional(),
  storageLocation: z.string().max(100).optional(),
  unitCostDollars: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  name: "",
  description: "",
  inventoryQty: 0,
  lowInventoryThreshold: null,
  itemType: "stock",
  sku: "",
  category: "",
  storageLocation: "",
  unitCostDollars: "",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  /** Existing categories across the business, for the datalist suggestion list. */
  categories: string[];
  /** Whether the `inventoryRentals` flag is on — the Rental option is disabled without it. */
  rentalsEnabled: boolean;
};

export function PoolDialog({
  open,
  onOpenChange,
  item,
  categories,
  rentalsEnabled,
}: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const isEdit = !!item;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        description: item.description ?? "",
        inventoryQty: item.inventoryQty,
        lowInventoryThreshold: item.lowInventoryThreshold ?? null,
        itemType: item.itemType === "rental" ? "rental" : "stock",
        sku: item.sku ?? "",
        category: item.category ?? "",
        storageLocation: item.storageLocation ?? "",
        unitCostDollars: centsToDollarsString(item.unitCostCents),
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [item, form]);

  const create = api.baseInventoryUnit.create.useMutation({
    onSuccess: () => {
      toast.success("Item created");
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
      onOpenChange(false);
    },
    onError: (err) =>
      applyTrpcErrorToForm(form, err, {
        fieldMap: { sku: "sku" },
        fallbackMessage: "Failed to create item",
      }),
  });

  const update = api.baseInventoryUnit.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
      onOpenChange(false);
    },
    onError: (err) =>
      applyTrpcErrorToForm(form, err, {
        fieldMap: { sku: "sku", "checked out": "itemType" },
        fallbackMessage: "Failed to update item",
      }),
  });

  const onSubmit = (values: FormValues) => {
    const unitCostCents = values.unitCostDollars?.trim()
      ? dollarsToCents(values.unitCostDollars)
      : null;

    if (isEdit) {
      update.mutate({
        id: item.id,
        name: values.name,
        // The router's `optionalText` trims and treats blank as "clear the
        // field" — sending the raw values straight through gives this dialog
        // the same "leave blank to clear" behavior `lowInventoryThreshold`
        // already has, with no client-side re-implementation needed.
        description: values.description,
        lowInventoryThreshold: values.lowInventoryThreshold ?? null,
        itemType: values.itemType,
        sku: values.sku,
        category: values.category,
        storageLocation: values.storageLocation,
        unitCostCents,
      });
    } else {
      create.mutate({
        name: values.name,
        description: values.description,
        inventoryQty: values.inventoryQty,
        lowInventoryThreshold: values.lowInventoryThreshold ?? null,
        itemType: values.itemType,
        sku: values.sku,
        category: values.category,
        storageLocation: values.storageLocation,
        unitCostCents,
      });
    }
  };

  const isPending = create.isPending || update.isPending;
  const categoriesListId = "inventory-item-categories";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this inventory item's details."
              : "Create a standalone inventory item. Link products to this item to sell from its stock."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                      <Label
                        htmlFor="item-type-stock"
                        className="hover:bg-accent has-[[data-state=checked]]:border-primary flex cursor-pointer items-start gap-2 rounded-lg border p-3 font-normal"
                      >
                        <RadioGroupItem value="stock" id="item-type-stock" />
                        <span className="grid gap-0.5">
                          <span className="text-sm font-medium">Stock</span>
                          <span className="text-muted-foreground text-xs">
                            Consumable supplies you use up
                          </span>
                        </span>
                      </Label>
                      <Label
                        htmlFor="item-type-rental"
                        className={`flex items-start gap-2 rounded-lg border p-3 font-normal ${
                          rentalsEnabled
                            ? "hover:bg-accent has-[[data-state=checked]]:border-primary cursor-pointer"
                            : "cursor-not-allowed opacity-50"
                        }`}
                      >
                        <RadioGroupItem
                          value="rental"
                          id="item-type-rental"
                          disabled={!rentalsEnabled}
                        />
                        <span className="grid gap-0.5">
                          <span className="text-sm font-medium">Rental</span>
                          <span className="text-muted-foreground text-xs">
                            Items you lend out and get back
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                  {!rentalsEnabled && (
                    <FormDescription>
                      Turn on Rental Check-outs under Settings → Features to add
                      rental items.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Gold Chiavari Chair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CHR-GLD-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input
                        list={categoriesListId}
                        placeholder="e.g. Seating"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {categories.length > 0 && (
              <datalist id={categoriesListId}>
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="storageLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage location (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Warehouse B, Shelf 3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCostDollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit cost / replacement value</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                          $
                        </span>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="inventoryQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="lowInventoryThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Low-stock threshold (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 20"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    You&apos;ll receive an email when the item&apos;s quantity
                    drops to or below this number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
