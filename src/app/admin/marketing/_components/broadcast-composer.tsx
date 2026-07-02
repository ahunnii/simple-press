"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Send, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { ExportRecipientsButton } from "./export-recipients-button";

// Mirrors marketingRouter.sendBroadcast's input schema (src/server/api/routers/marketing.ts)
// so client-side validation agrees with the server.
const broadcastComposerSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or fewer"),
  body: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be 5,000 characters or fewer"),
});

type BroadcastComposerFormData = z.infer<typeof broadcastComposerSchema>;

interface BroadcastComposerProps {
  recipientCount: number;
}

export function BroadcastComposer({ recipientCount }: BroadcastComposerProps) {
  const form = useForm<BroadcastComposerFormData>({
    resolver: zodResolver(broadcastComposerSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      subject: "",
      body: "",
    },
  });

  useDirtyForm(form.formState.isDirty);

  const sendMutation = api.marketing.sendBroadcast.useMutation({
    onSuccess: (data) => {
      if (data.test) {
        toast.success("Test email sent to your inbox.");
      } else {
        toast.success(
          `Broadcast sent — ${data.sent.toString()} delivered${data.failed > 0 ? `, ${data.failed.toString()} failed` : ""}.`,
        );
        form.reset({ subject: "", body: "" });
      }
    },
    onError: (error) => {
      applyTrpcErrorToForm(form, error);
    },
  });

  const isPending = sendMutation.isPending;
  const subjectValue = form.watch("subject") ?? "";
  const bodyValue = form.watch("body") ?? "";

  const handleTestSend = form.handleSubmit((data) => {
    sendMutation.mutate({
      subject: data.subject.trim(),
      body: data.body.trim(),
      testOnly: true,
    });
  });

  const handleRealSend = form.handleSubmit((data) => {
    sendMutation.mutate({
      subject: data.subject.trim(),
      body: data.body.trim(),
      testOnly: false,
    });
  });

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Audience summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm tabular-nums">
                  {recipientCount.toLocaleString()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {recipientCount === 1
                    ? "customer opted in to marketing emails"
                    : "customers opted in to marketing emails"}
                </span>
              </div>
              <ExportRecipientsButton disabled={recipientCount === 0} />
            </div>
            {recipientCount === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No customers have opted in yet. Customers can enable marketing
                emails from their account preferences page.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Composer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Compose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <InputFormField
              form={form}
              name="subject"
              label="Subject"
              placeholder="Your monthly update from us"
              disabled={isPending}
              required
              description={`${subjectValue.length.toString()}/200 characters`}
              descriptionClassName="text-xs"
            />

            <TextareaFormField
              form={form}
              name="body"
              label="Message"
              placeholder={"Hi there,\n\nHere's what's new this month…"}
              rows={10}
              disabled={isPending}
              required
              textareaClassName="resize-y font-[inherit] text-sm leading-relaxed"
              description={`${bodyValue.length.toString()}/5,000 characters · Plain text only — each paragraph becomes its own line in the email.`}
              descriptionClassName="text-xs"
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Test send */}
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleTestSend()}
                disabled={!form.formState.isValid || isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send test to myself
              </Button>

              {/* Real send — confirm dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={
                      !form.formState.isValid ||
                      isPending ||
                      recipientCount === 0
                    }
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to {recipientCount.toLocaleString()}{" "}
                    {recipientCount === 1 ? "customer" : "customers"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send this broadcast?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send &ldquo;{subjectValue || "your email"}
                      &rdquo; to{" "}
                      <strong>
                        {recipientCount.toLocaleString()}{" "}
                        {recipientCount === 1 ? "customer" : "customers"}
                      </strong>{" "}
                      who opted in to marketing emails. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleRealSend()}
                      disabled={isPending}
                    >
                      Send broadcast
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
