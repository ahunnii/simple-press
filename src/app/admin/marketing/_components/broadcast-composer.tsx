"use client";

import { useState } from "react";
import { Loader2, Mail, Send, Users } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

interface BroadcastComposerProps {
  recipientCount: number;
}

export function BroadcastComposer({ recipientCount }: BroadcastComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendMutation = api.marketing.sendBroadcast.useMutation({
    onSuccess: (data) => {
      if (data.test) {
        toast.success("Test email sent to your inbox.");
      } else {
        toast.success(
          `Broadcast sent — ${data.sent.toString()} delivered${data.failed > 0 ? `, ${data.failed.toString()} failed` : ""}.`,
        );
        setSubject("");
        setBody("");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send broadcast.");
    },
  });

  const isValid = subject.trim().length > 0 && body.trim().length > 0;
  const isPending = sendMutation.isPending;

  function handleTestSend() {
    if (!isValid) return;
    sendMutation.mutate({ subject: subject.trim(), body: body.trim(), testOnly: true });
  }

  function handleRealSend() {
    if (!isValid) return;
    sendMutation.mutate({ subject: subject.trim(), body: body.trim(), testOnly: false });
  }

  return (
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
          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">Subject</Label>
            <Input
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your monthly update from us"
              maxLength={200}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {subject.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Message</Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi there,\n\nHere's what's new this month…"}
              rows={10}
              maxLength={5000}
              disabled={isPending}
              className="resize-y font-[inherit] text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              {body.length}/5,000 characters · Plain text only — each paragraph
              becomes its own line in the email.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Test send */}
            <Button
              variant="outline"
              onClick={handleTestSend}
              disabled={!isValid || isPending}
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
                <Button disabled={!isValid || isPending || recipientCount === 0}>
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
                    This will send &ldquo;{subject || "your email"}&rdquo; to{" "}
                    <strong>
                      {recipientCount.toLocaleString()}{" "}
                      {recipientCount === 1 ? "customer" : "customers"}
                    </strong>{" "}
                    who opted in to marketing emails. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRealSend}>
                    Send broadcast
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
