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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

type Pool = RouterOutputs["baseInventoryUnit"]["list"][number];

const schema = z.object({
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or greater"),
  reason: z.enum(["restock", "adjustment", "correction", "damage", "return"]),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  pool: Pool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PoolAdjustInventory({ pool, open, onOpenChange }: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      quantity: pool.inventoryQty,
      reason: "adjustment",
      note: "",
    },
  });

  const adjust = api.baseInventoryUnit.adjustInventory.useMutation({
    onSuccess: () => {
      toast.success("Inventory updated");
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message ?? "Failed to update inventory"),
  });

  const onSubmit = (values: FormValues) => {
    adjust.mutate({ id: pool.id, ...values });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust: {pool.name}</DialogTitle>
          <DialogDescription>
            Set a new absolute quantity for this inventory pool and record a
            reason for the change.
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mb-2 text-sm">
          Current quantity: <strong>{pool.inventoryQty}</strong>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormDescription>
                    Set the absolute pool quantity.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="damage">Damage / Loss</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={adjust.isPending}>
                {adjust.isPending ? "Saving…" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
