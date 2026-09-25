"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "~/components/ui/textarea";

import { blankToUndefined } from "../../_lib/format";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../../../_lib/admin-mutation-toast";

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
  dueBackOn: z.string().optional(),
  notes: z.string().trim().max(NOTES_MAX).optional(),
});
type FormValues = z.infer<typeof formSchema>;

type Props = {
  checkout: {
    id: string;
    label: string;
    customerName: string | null;
    notes: string | null;
    dueBackOnYmd: string | null;
  };
};

export function EditCheckoutDialog({ checkout }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const defaultValues: FormValues = {
    label: checkout.label,
    customerName: checkout.customerName ?? "",
    dueBackOn: checkout.dueBackOnYmd ?? "",
    notes: checkout.notes ?? "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const updateDetails = api.inventoryCheckout.updateDetails.useMutation({
    onMutate: loadingToast("Saving…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Check-out details updated");
      setOpen(false);
      void utils.inventoryCheckout.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fieldMap: { "due date": "dueBackOn" },
        fallbackMessage: "Failed to update check-out details",
      });
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaultValues);
  };

  const onSubmit = (values: FormValues) => {
    updateDetails.mutate({
      id: checkout.id,
      label: values.label.trim(),
      customerName: blankToUndefined(values.customerName) ?? null,
      notes: blankToUndefined(values.notes) ?? null,
      dueBackOn: blankToUndefined(values.dueBackOn) ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit check-out details</DialogTitle>
          <DialogDescription>
            Allowed even after the check-out is closed — fix a typo or update
            the record without touching quantities.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Event or client</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Customer name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Due back</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={updateDetails.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateDetails.isPending}>
                {updateDetails.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
