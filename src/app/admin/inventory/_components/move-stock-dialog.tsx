"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { RouterOutputs } from "~/trpc/react";
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
import { Textarea } from "~/components/ui/textarea";

import { availableNow } from "../_lib/stock-state";

type Item = RouterOutputs["baseInventoryUnit"]["items"]["items"][number];

const schema = z.object({
  quantity: z.coerce.number().int().min(1, "Enter at least 1"),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  item: Item;
  /** "use" takes stock off the shelf; "restock" adds units to any item type. */
  mode: "use" | "restock";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const COPY = {
  use: {
    title: (name: string) => `Use: ${name}`,
    description:
      "Record units used from the shelf. This only draws from what's actually available — not units a storefront checkout is holding.",
    submitLabel: "Use",
    submitting: "Recording…",
  },
  restock: {
    title: (name: string) => `Restock: ${name}`,
    description: "Add units back onto the shelf.",
    submitLabel: "Restock",
    submitting: "Restocking…",
  },
} as const;

export function MoveStockDialog({ item, mode, open, onOpenChange }: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const copy = COPY[mode];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { quantity: 1, note: "" },
  });

  const moveStock = api.baseInventoryUnit.moveStock.useMutation({
    onSuccess: (result) => {
      toast.success(
        mode === "use"
          ? `Used ${form.getValues("quantity")} — ${result?.newQty ?? "?"} left`
          : `Restocked — ${result?.newQty ?? "?"} on hand`,
      );
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
      onOpenChange(false);
      form.reset({ quantity: 1, note: "" });
    },
    onError: (err) =>
      toast.error(
        err.message ??
          (mode === "use" ? "Failed to record use" : "Failed to restock"),
      ),
  });

  const onSubmit = (values: FormValues) => {
    moveStock.mutate({
      id: item.id,
      kind: mode,
      quantity: values.quantity,
      note: values.note?.length ? values.note : undefined,
    });
  };

  const available = availableNow(item);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset({ quantity: 1, note: "" });
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title(item.name)}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mb-2 text-sm">
          On hand:{" "}
          <strong className="text-foreground">{item.inventoryQty}</strong>
          {mode === "use" && (
            <>
              {" "}
              · Available:{" "}
              <strong className="text-foreground">{available}</strong>
            </>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormDescription>
                    {mode === "use"
                      ? "e.g. what it was used for."
                      : "e.g. where the restock came from."}
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
              <Button type="submit" disabled={moveStock.isPending}>
                {moveStock.isPending ? copy.submitting : copy.submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
