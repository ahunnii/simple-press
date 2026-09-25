"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { InvoiceDueTerms } from "~/lib/validators/invoice";
import { zonedCalendarDate } from "~/lib/calendar-date";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { resolveDueDateYmd } from "~/lib/invoices/status";
import { formatPrice } from "~/lib/prices";
import {
  INVOICE_DUE_TERMS_LABELS,
  INVOICE_MESSAGE_MAX_LENGTH,
  INVOICE_SEND_DELIVERY_VALUES,
} from "~/lib/validators/invoice";
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
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { blankToUndefined, formatYmdLabel } from "./format";

const sendFormSchema = z.object({
  deliver: z.enum(INVOICE_SEND_DELIVERY_VALUES),
  message: z.string().max(INVOICE_MESSAGE_MAX_LENGTH).optional(),
});
type SendFormValues = z.infer<typeof sendFormSchema>;

type Props = {
  invoice: {
    id: string;
    displayNumber: string;
    customerEmail: string;
    totalCents: number;
    dueTerms: InvoiceDueTerms;
    dueDateYmd: string | null;
    timeZone: string;
  };
};

export function SendInvoiceDialog({ invoice }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: { deliver: "email", message: "" },
  });

  const sendMutation = api.invoice.send.useMutation({
    onMutate: loadingToast("Sending invoice…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      if (variables.deliver === "email" && !data.emailed) {
        toast.warning(
          "Invoice marked sent but the email failed — copy the link and send it yourself",
        );
      } else {
        toast.success(
          variables.deliver === "email"
            ? "Invoice sent"
            : "Invoice marked as sent",
        );
      }
      setOpen(false);
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to send invoice",
      });
    },
  });

  const deliver = form.watch("deliver");
  const todayYmd = zonedCalendarDate(new Date(), invoice.timeZone);
  const dueYmd = resolveDueDateYmd(
    invoice.dueTerms,
    todayYmd,
    invoice.dueDateYmd ?? undefined,
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset({ deliver: "email", message: "" });
  };

  const onSubmit = (values: SendFormValues) => {
    sendMutation.mutate({
      id: invoice.id,
      deliver: values.deliver,
      message: blankToUndefined(values.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Send className="h-4 w-4" />
          Send
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send {invoice.displayNumber}</DialogTitle>
          <DialogDescription>
            Send this invoice to {invoice.customerEmail}, or mark it sent
            without emailing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="deliver"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="email" id="deliver-email" />
                        <Label htmlFor="deliver-email" className="font-normal">
                          Email to {invoice.customerEmail}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="manual" id="deliver-manual" />
                        <Label htmlFor="deliver-manual" className="font-normal">
                          Mark as sent without emailing
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {deliver === "email" && (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel>Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="A note to include above the invoice summary"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="bg-muted/50 rounded-md border px-3 py-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium tabular-nums">
                  {formatPrice(invoice.totalCents)}
                </span>
              </div>
              <div className="text-muted-foreground mt-1">
                {INVOICE_DUE_TERMS_LABELS[invoice.dueTerms]}
                {dueYmd && ` → ${formatYmdLabel(dueYmd)}`}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={sendMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sendMutation.isPending}>
                {sendMutation.isPending
                  ? "Sending…"
                  : deliver === "email"
                    ? "Send invoice"
                    : "Mark as sent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
