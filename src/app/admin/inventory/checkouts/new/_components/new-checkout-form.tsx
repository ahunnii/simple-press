"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronsUpDown,
  PackageSearch,
  Plus,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { RouterOutputs } from "~/trpc/react";
import { localCalendarDate } from "~/lib/calendar-date";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";

import { blankToUndefined } from "../../_lib/format";
import { InventoryTabs } from "../../../_components/inventory-tabs";
import { AdminEmpty } from "../../../../_components/admin-empty";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../../../_lib/admin-mutation-toast";

type AvailableItem =
  RouterOutputs["inventoryCheckout"]["availableRentalItems"][number];

type Line = {
  itemId: string;
  name: string;
  sku: string | null;
  available: number;
  qty: number;
};

const LABEL_MAX = 191;
const CUSTOMER_MAX = 191;
const NOTES_MAX = 5000;

const formSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(LABEL_MAX, `Label must be ${LABEL_MAX} characters or fewer`),
  customerName: z.string().trim().max(CUSTOMER_MAX).optional(),
  checkedOutOn: z.string().min(1, "Pick a check-out date"),
  dueBackOn: z.string().optional(),
  notes: z.string().trim().max(NOTES_MAX).optional(),
});
type FormValues = z.infer<typeof formSchema>;

/** Searchable picker for adding a line. Selecting an item already on the
 *  form bumps its quantity by one instead of creating a duplicate row — see
 *  `handlePick` in the parent. */
function ItemPicker({
  items,
  addedIds,
  onPick,
  disabled,
}: {
  items: AvailableItem[];
  /** Items already on the form — picking one again merges into that row
   *  (bumps its quantity) instead of adding a duplicate. */
  addedIds: Set<string>;
  onPick: (item: AvailableItem) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal sm:w-80"
        >
          <span className="text-muted-foreground truncate">
            Add a rental item…
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase().trim())
              ? 1
              : 0
          }
        >
          <CommandInput placeholder="Search by name or SKU…" />
          <CommandList>
            <CommandEmpty>No rental items found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const added = addedIds.has(item.id);
                return (
                  <CommandItem
                    key={item.id}
                    value={[item.name, item.sku ?? "", item.id].join(" ")}
                    onSelect={() => {
                      onPick(item);
                      setOpen(false);
                    }}
                    className="gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {item.sku ? `${item.sku} · ` : ""}
                        {item.available} available
                        {added ? " · already added, adds one more" : ""}
                      </p>
                    </div>
                    {added && (
                      <Check className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type Props = {
  items: AvailableItem[];
  preselectItemId?: string;
};

export function NewCheckoutForm({ items, preselectItemId }: Props) {
  const router = useRouter();

  const preselect = preselectItemId
    ? items.find((i) => i.id === preselectItemId)
    : undefined;

  const [lines, setLines] = useState<Line[]>(
    preselect
      ? [
          {
            itemId: preselect.id,
            name: preselect.name,
            sku: preselect.sku,
            available: preselect.available,
            qty: 1,
          },
        ]
      : [],
  );
  const [linesError, setLinesError] = useState<string | null>(null);

  const today = useMemo(() => localCalendarDate(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      customerName: "",
      checkedOutOn: today,
      dueBackOn: "",
      notes: "",
    },
  });

  const create = api.inventoryCheckout.create.useMutation({
    onMutate: loadingToast("Creating check-out…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Check-out created");
      router.push(`/admin/inventory/checkouts/${data.id}`);
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      // Verbatim: the short-stock error lists every item that's short, and
      // has no zodError to map to a field, so this always lands in the
      // fallback toast tier with the full server message intact.
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to create check-out",
      });
    },
  });

  const handlePick = (item: AvailableItem) => {
    setLinesError(null);
    setLines((current) => {
      const existing = current.find((l) => l.itemId === item.id);
      if (existing) {
        return current.map((l) =>
          l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...current,
        {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          available: item.available,
          qty: 1,
        },
      ];
    });
  };

  const handleQtyChange = (itemId: string, qty: number) => {
    setLines((current) =>
      current.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
    );
  };

  const handleRemove = (itemId: string) => {
    setLines((current) => current.filter((l) => l.itemId !== itemId));
  };

  const onSubmit = (values: FormValues) => {
    if (lines.length === 0) {
      setLinesError("Add at least one item");
      return;
    }
    const badQty = lines.find((l) => !Number.isInteger(l.qty) || l.qty < 1);
    if (badQty) {
      setLinesError(`Enter a quantity of at least 1 for ${badQty.name}`);
      return;
    }
    setLinesError(null);

    // Only send `checkedOutAt` when it's been backdated — otherwise let the
    // server default to the exact current instant rather than an
    // approximated noon. Constructed at local noon (not UTC midnight) so
    // the picked calendar day survives the trip through a `Date` regardless
    // of which side of UTC midnight the admin's own browser sits on.
    const checkedOutAt =
      values.checkedOutOn === today
        ? undefined
        : new Date(`${values.checkedOutOn}T12:00:00`);

    create.mutate({
      label: values.label.trim(),
      customerName: blankToUndefined(values.customerName),
      notes: blankToUndefined(values.notes),
      checkedOutAt,
      dueBackOn: blankToUndefined(values.dueBackOn),
      lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
    });
  };

  if (items.length === 0) {
    return (
      <div className="admin-container">
        <InventoryTabs rentalsEnabled />
        <div className="admin-header">
          <div>
            <h1>New check-out</h1>
            <p>Record rental items going out to an event or client.</p>
          </div>
        </div>
        <AdminEmpty
          icon={PackageSearch}
          title="No rental items yet"
          description="Mark items as “Rental” on the Items page before checking anything out."
          action={
            <Button variant="outline" asChild>
              <Link href="/admin/inventory">Go to Items</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="admin-container max-w-3xl">
      <InventoryTabs rentalsEnabled />
      <div className="admin-header">
        <div>
          <h1>New check-out</h1>
          <p>Record rental items going out to an event or client.</p>
        </div>
      </div>
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="gap-1.5 sm:col-span-2">
                  <FormLabel>Event or client</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Alvarez wedding, Sat 10/3"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Customer name (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div />

            <FormField
              control={form.control}
              name="checkedOutOn"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Check-out date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueBackOn"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Due back (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      min={form.watch("checkedOutOn") || undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="gap-1.5 sm:col-span-2">
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Items</h2>
              <ItemPicker
                items={items}
                addedIds={new Set(lines.map((l) => l.itemId))}
                onPick={handlePick}
              />
            </div>

            {lines.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
                No items added yet.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {lines.map((line) => {
                  const over = line.qty > line.available;
                  return (
                    <li
                      key={line.itemId}
                      className="flex flex-wrap items-center gap-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {line.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {line.sku ? `${line.sku} · ` : ""}
                          {line.available} available
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(e) =>
                            handleQtyChange(
                              line.itemId,
                              Number.parseInt(e.target.value, 10) || 0,
                            )
                          }
                          className={cn("w-20", over && "border-amber-500")}
                          aria-label={`Quantity for ${line.name}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(line.itemId)}
                          aria-label={`Remove ${line.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {over && (
                        <p className="w-full text-xs text-amber-600 dark:text-amber-400">
                          Only {line.available} available — the check-out will
                          be rejected unless this is lowered.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {linesError && (
              <p className="text-destructive text-sm">{linesError}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={create.isPending}>
              <Plus className="h-4 w-4" />
              {create.isPending ? "Creating…" : "Create check-out"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/inventory/checkouts">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
