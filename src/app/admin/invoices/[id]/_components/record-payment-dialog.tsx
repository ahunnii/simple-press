"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandCoins } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { zonedCalendarDate } from "~/lib/calendar-date";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import {
  centsToDollarsString,
  dollarsToCents,
  formatPrice,
} from "~/lib/prices";
import {
  INVOICE_PAYMENT_NOTE_MAX_LENGTH,
  INVOICE_PAYMENT_RECORD_METHOD_LABELS,
  INVOICE_PAYMENT_RECORD_METHOD_VALUES,
  INVOICE_PAYMENT_REFERENCE_MAX_LENGTH,
  invoiceYmdSchema,
} from "~/lib/validators/invoice";
import { api } from "~/trpc/react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { blankToUndefined } from "./format";

const recordPaymentFormSchema = z.object({
  amountDollars: z.string().min(1, "Enter an amount"),
  paidOn: invoiceYmdSchema,
  method: z.enum(INVOICE_PAYMENT_RECORD_METHOD_VALUES),
  reference: z.string().max(INVOICE_PAYMENT_REFERENCE_MAX_LENGTH).optional(),
  note: z.string().max(INVOICE_PAYMENT_NOTE_MAX_LENGTH).optional(),
  emailReceipt: z.boolean(),
});
type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>;

type Props = {
  invoiceId: string;
  balanceCents: number;
  timeZone: string;
  sentVia: string | null;
};

export function RecordPaymentDialog({
  invoiceId,
  balanceCents,
  timeZone,
  sentVia,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const defaultValues: RecordPaymentFormValues = {
    amountDollars: centsToDollarsString(balanceCents),
    paidOn: zonedCalendarDate(new Date(), timeZone),
    method: "bank_transfer",
    reference: "",
    note: "",
    emailReceipt: sentVia === "email",
  };

  const form = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues,
  });

  const recordPayment = api.invoice.recordPayment.useMutation({
    onMutate: loadingToast("Recording payment…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      if (data.receiptEmailed === false) {
        toast.warning("Payment recorded, but the receipt email failed to send");
      } else {
        toast.success("Payment recorded");
      }
      setOpen(false);
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to record payment",
      });
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaultValues);
  };

  const onSubmit = (values: RecordPaymentFormValues) => {
    const amountCents = dollarsToCents(values.amountDollars);
    if (!(amountCents > 0)) {
      form.setError("amountDollars", {
        message: "Enter an amount of at least $0.01",
      });
      return;
    }
    if (amountCents > balanceCents) {
      form.setError("amountDollars", {
        message: `Amount can't exceed the balance of ${formatPrice(balanceCents)}`,
      });
      return;
    }

    recordPayment.mutate({
      invoiceId,
      amountCents,
      paidOn: values.paidOn,
      method: values.method,
      reference: blankToUndefined(values.reference),
      note: blankToUndefined(values.note),
      emailReceipt: values.emailReceipt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <HandCoins className="h-4 w-4" />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Balance due: {formatPrice(balanceCents)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amountDollars"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                        $
                      </span>
                      <Input
                        {...field}
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="pl-7"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="paidOn"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel>Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-card w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVOICE_PAYMENT_RECORD_METHOD_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {INVOICE_PAYMENT_RECORD_METHOD_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Reference (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Check #, transaction id…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailReceipt"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      id="email-receipt"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <Label
                    htmlFor="email-receipt"
                    className="cursor-pointer font-normal"
                  >
                    Email receipt to customer
                  </Label>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={recordPayment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Recording…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
