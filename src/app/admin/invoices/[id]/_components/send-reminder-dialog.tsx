"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { INVOICE_MESSAGE_MAX_LENGTH } from "~/lib/validators/invoice";
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
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { blankToUndefined, formatYmdLabel } from "./format";

const reminderFormSchema = z.object({
  message: z.string().max(INVOICE_MESSAGE_MAX_LENGTH).optional(),
});
type ReminderFormValues = z.infer<typeof reminderFormSchema>;

type Props = {
  invoiceId: string;
  customerEmail: string;
  isOverdue: boolean;
  dueDateYmd: string | null;
  disabled?: boolean;
  disabledReason?: string;
};

export function SendReminderDialog({
  invoiceId,
  customerEmail,
  isOverdue,
  dueDateYmd,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: { message: "" },
  });

  const sendReminder = api.invoice.sendReminder.useMutation({
    onMutate: loadingToast("Sending reminder…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Reminder sent");
      setOpen(false);
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to send reminder",
      });
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset({ message: "" });
  };

  const onSubmit = (values: ReminderFormValues) => {
    sendReminder.mutate({
      id: invoiceId,
      message: blankToUndefined(values.message),
    });
  };

  const trigger = (
    <Button size="sm" variant="outline" disabled={disabled}>
      <BellRing className="h-4 w-4" />
      Send reminder
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* A disabled button swallows pointer events, so the tooltip
             *  listens on a wrapping span instead — the usual Radix pattern
             *  for a hint on a disabled control. */}
            <span tabIndex={0} className="inline-flex">
              {trigger}
            </span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a reminder</DialogTitle>
          <DialogDescription>
            {isOverdue
              ? `This invoice is overdue${dueDateYmd ? ` (was due ${formatYmdLabel(dueDateYmd)})` : ""}. `
              : dueDateYmd
                ? `This invoice isn't due until ${formatYmdLabel(dueDateYmd)}. `
                : ""}
            An email will be sent to {customerEmail}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={sendReminder.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sendReminder.isPending}>
                {sendReminder.isPending ? "Sending…" : "Send reminder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
