"use client";

import { useEffect } from "react";
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

type Pool = RouterOutputs["baseInventoryUnit"]["list"][number];

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
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool?: Pool;
};

export function PoolDialog({ open, onOpenChange, pool }: Props) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const isEdit = !!pool;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      inventoryQty: 0,
      lowInventoryThreshold: null,
    },
  });

  useEffect(() => {
    if (pool) {
      form.reset({
        name: pool.name,
        description: pool.description ?? "",
        inventoryQty: pool.inventoryQty,
        lowInventoryThreshold: pool.lowInventoryThreshold ?? null,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        inventoryQty: 0,
        lowInventoryThreshold: null,
      });
    }
  }, [pool, form]);

  const create = api.baseInventoryUnit.create.useMutation({
    onSuccess: () => {
      toast.success("Base unit created");
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message ?? "Failed to create base unit"),
  });

  const update = api.baseInventoryUnit.update.useMutation({
    onSuccess: () => {
      toast.success("Base unit updated");
      void apiUtils.baseInventoryUnit.invalidate();
      router.refresh();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message ?? "Failed to update base unit"),
  });

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      update.mutate({
        id: pool.id,
        name: values.name,
        description: values.description ?? null,
        lowInventoryThreshold: values.lowInventoryThreshold ?? null,
      });
    } else {
      create.mutate({
        name: values.name,
        description: values.description,
        inventoryQty: values.inventoryQty,
        lowInventoryThreshold: values.lowInventoryThreshold ?? null,
      });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Base Unit" : "New Base Unit"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 4-pack Roll" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the shared inventory unit (e.g. the smallest
                    pack your products are composed of).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    You&apos;ll receive an email when pool quantity drops to or
                    below this number.
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
