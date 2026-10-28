"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { describePolicyDocs } from "~/lib/legal/policy-docs";
import { formatPolicyDate } from "~/lib/legal/policy-versions";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type PolicyUpdate = RouterOutputs["platform"]["listPolicyUpdates"][number];

type Props = {
  updates: PolicyUpdate[];
};

export function PolicyUpdatesPanel({ updates }: Props) {
  if (updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No material policy updates yet</CardTitle>
          <CardDescription>
            Only changes that matter to existing owners (new fees, new grounds
            for suspension, a new kind of data collected&hellip;) belong here.
            Typos and clarifications just bump the date in{" "}
            <code>POLICY_LAST_UPDATED</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>To announce a material change:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Edit the policy page and bump its date in{" "}
              <code>src/lib/legal/policy-versions.ts</code>.
            </li>
            <li>
              Append an entry to <code>MATERIAL_POLICY_UPDATES</code> in{" "}
              <code>src/lib/legal/material-updates.ts</code>: a unique{" "}
              <code>id</code>, the <code>documents</code> bundles it touches,{" "}
              <code>announcedOn</code>, an <code>effectiveOn</code> at least 30
              days later, and a plain-language <code>summary</code>. Entries are
              append-only.
            </li>
            <li>
              Deploy, then come back here and send the notice email. Owners also
              see a banner in their store admin until they press &ldquo;Got
              it&rdquo;.
            </li>
          </ol>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <PolicyUpdateCard key={update.id} update={update} />
      ))}
    </div>
  );
}

function PolicyUpdateCard({ update }: { update: PolicyUpdate }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {describePolicyDocs(update.documents)}
              {!update.announced ? (
                <Badge variant="secondary">Not announced yet</Badge>
              ) : update.pending ? (
                <Badge variant="warning">Pending</Badge>
              ) : (
                <Badge variant="success">In effect</Badge>
              )}
            </CardTitle>
            <CardDescription>
              <code>{update.id}</code>
            </CardDescription>
          </div>
          <NoticeStatus update={update} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{update.summary}</p>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:max-w-md">
          <div>
            <dt className="text-gray-500">Announced</dt>
            <dd className="font-medium">
              {formatPolicyDate(update.announcedOn)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Effective</dt>
            <dd className="font-medium">
              {formatPolicyDate(update.effectiveOn)}
            </dd>
          </div>
        </dl>

        {update.notice.state !== "sent" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!update.announced}
            >
              <Mail aria-hidden="true" />
              Send notice
            </Button>
            {!update.announced ? (
              <span className="text-sm text-gray-500">
                Available once the announcement date arrives.
              </span>
            ) : update.notice.state === "unknown" ? (
              <span className="text-sm text-gray-500">
                Couldn&apos;t read the send ledger. Sending will be refused
                until{" "}
                <code>prisma/manual/2026-10-21-policy-acceptance-log.sql</code>{" "}
                is applied.
              </span>
            ) : null}
          </div>
        ) : null}

        <SendNoticeDialog
          update={update}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
        />
      </CardContent>
    </Card>
  );
}

function NoticeStatus({ update }: { update: PolicyUpdate }) {
  const { notice } = update;
  if (notice.state === "sent") {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Badge variant="success">Notice sent</Badge>
        <span className="text-xs text-gray-500">
          {formatDate(notice.sentAt)} &middot; {notice.recipientCount}{" "}
          {notice.recipientCount === 1 ? "owner" : "owners"}
        </span>
      </div>
    );
  }
  if (notice.state === "unknown") {
    return <Badge variant="secondary">Send status unknown</Badge>;
  }
  return <Badge variant="outline">Notice not sent</Badge>;
}

function SendNoticeDialog({
  update,
  open,
  onOpenChange,
}: {
  update: PolicyUpdate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const preview = api.platform.previewPolicyUpdateNotice.useQuery(
    { updateId: update.id },
    { enabled: open },
  );

  const send = api.platform.sendPolicyUpdateNotice.useMutation({
    onSuccess: (result) => {
      if (result.alreadySent) {
        toast.info("This notice was already sent.");
      } else if (!result.recorded) {
        toast.warning(
          `Sent to ${result.recipientCount} owners, but the send could not be recorded. Do NOT send again.`,
        );
      } else {
        toast.success(
          `Notice sent to ${result.recipientCount} ${result.recipientCount === 1 ? "owner" : "owners"}` +
            (result.rejected > 0
              ? ` (${result.rejected} addresses were rejected)`
              : ""),
        );
      }
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send the notice");
    },
  });

  const count = preview.data?.recipientCount;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Don't let a stray click dismiss the dialog mid-send.
        if (send.isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send policy update notice?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {preview.isLoading ? (
                  "Counting recipients…"
                ) : preview.isError ? (
                  "Couldn't count the recipients."
                ) : (
                  <>
                    This emails <strong>{count}</strong>{" "}
                    {count === 1 ? "store owner" : "store owners"} (everyone who
                    owns at least one store that isn&apos;t closed) about the{" "}
                    {describePolicyDocs(update.documents)} update effective{" "}
                    {formatPolicyDate(update.effectiveOn)}.
                  </>
                )}
              </p>
              <p>
                It is a legal notice, so it goes out even to owners who have
                opted out of marketing. It can only be sent once.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={send.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={() => send.mutate({ updateId: update.id })}
            disabled={
              send.isPending ||
              preview.isLoading ||
              preview.isError ||
              count === 0
            }
          >
            {send.isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Sending&hellip;
              </>
            ) : (
              "Send notice"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
