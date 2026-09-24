"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { formatPrice } from "~/lib/prices";
import { INVOICE_CANCEL_REASON_MAX_LENGTH } from "~/lib/validators/invoice";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
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
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { blankToUndefined } from "./format";

const cancelFormSchema = z.object({
  reason: z.string().max(INVOICE_CANCEL_REASON_MAX_LENGTH).optional(),
  notifyCustomer: z.boolean(),
});
type CancelFormValues = z.infer<typeof cancelFormSchema>;

type Props = {
  invoiceId: string;
  amountPaidCents: number;
};

export function CancelInvoiceDialog({ invoiceId, amountPaidCents }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const defaultValues: CancelFormValues = { reason: "", notifyCustomer: true };
  const form = useForm<CancelFormValues>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues,
  });

  const cancelInvoice = api.invoice.cancel.useMutation({
    onMutate: loadingToast("Cancelling invoice…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      if (variables.notifyCustomer && data.customerNotified === false) {
        toast.warning(
          "Invoice cancelled, but the customer wasn't notified — the email failed",
        );
      } else {
        toast.success("Invoice cancelled");
      }
      setOpen(false);
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to cancel invoice",
      });
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaultValues);
  };

  const onSubmit = (values: CancelFormValues) => {
    cancelInvoice.mutate({
      id: invoiceId,
      reason: blankToUndefined(values.reason),
      notifyCustomer: values.notifyCustomer,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
        >
          <Ban className="h-4 w-4" />
          Cancel invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this invoice?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone. The customer can no longer pay this
            invoice once it&apos;s cancelled.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            {amountPaidCents > 0 && (
              <Alert>
                <AlertDescription>
                  {formatPrice(amountPaidCents)} already recorded on this
                  invoice will stay on record.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Reason (shown to the customer)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Why is this invoice being cancelled?"
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyCustomer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      id="notify-cancel"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <Label
                    htmlFor="notify-cancel"
                    className="cursor-pointer font-normal"
                  >
                    Email the customer that this invoice was cancelled
                  </Label>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={cancelInvoice.isPending}
              >
                Keep invoice
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelInvoice.isPending}
              >
                {cancelInvoice.isPending ? "Cancelling…" : "Cancel invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
