"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { CONTACT_IMPORT_ATTESTATION_WORDING } from "~/lib/marketing/contact-import";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import { CampaignStatusBadge } from "../../../marketing/_components/campaign-status-badge";

type Props = {
  importId: string;
  businessName: string;
  /** False when the business has no postal address (the invite is blocked). */
  hasPostalAddress: boolean;
};

const SETTINGS_PATH = "/admin/settings/general";

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/**
 * Step 4: the one-time "Ask them to join your list" invite. Used right after a
 * commit and when reopening an import from history, so it loads the import
 * itself to learn whether the invite already exists.
 */
export function InviteCard({
  importId,
  businessName,
  hasPostalAddress,
}: Props) {
  const utils = api.useUtils();
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [attested, setAttested] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const importQuery = api.contactImport.get.useQuery(
    { importId },
    { retry: false },
  );
  const audience = api.contactImport.inviteAudienceCount.useQuery(
    { importId },
    { retry: false, refetchOnWindowFocus: false },
  );

  const queueInvite = api.contactImport.queueInvite.useMutation({
    onSuccess: ({ recipientCount }) => {
      setSendError(null);
      toast.success(
        `Invite on its way to ${recipientCount.toLocaleString()} ${plural(recipientCount, "person", "people")}`,
      );
      void utils.contactImport.get.invalidate({ importId });
      void utils.contactImport.list.invalidate();
      void utils.marketing.listCampaigns.invalidate();
    },
    onError: (error) => {
      setSendError(error.message || "Couldn't send the invite.");
    },
  });

  if (importQuery.isPending) {
    return (
      <Card>
        <CardContent className="py-10">
          <div
            className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
            role="status"
          >
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (importQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Couldn&apos;t open this import</AlertTitle>
        <AlertDescription>{importQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  const imp = importQuery.data;
  const campaign = imp.inviteCampaign;
  const eligible = imp.counts?.inviteEligible ?? 0;
  const confirmed = imp.confirmedCount;

  // One invite per import, ever.
  if (campaign) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2
              aria-hidden="true"
              className="h-5 w-5 text-green-600"
            />
            {campaign.status === "SENT" ? "Invite sent" : "Invite on its way"}
          </CardTitle>
          <CardDescription>
            The invite for this import has been queued. It can only go out once,
            so there are no reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <CampaignStatusBadge status={campaign.status} />
            <span>
              <span className="font-medium tabular-nums">
                {campaign.recipientCount.toLocaleString()}
              </span>{" "}
              {plural(campaign.recipientCount, "person", "people")} invited
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span>
              <span className="font-medium tabular-nums">
                {confirmed.toLocaleString()}
              </span>{" "}
              joined so far
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/admin/marketing/campaigns/${campaign.id}`}>
                View the invite in Email Marketing
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/customers/import/history">Import history</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const count = audience.data?.count ?? null;
  const nobodyToInvite = count === 0 || (count === null && eligible === 0);
  const canSend =
    attested &&
    hasPostalAddress &&
    !nobodyToInvite &&
    !queueInvite.isPending &&
    !queueInvite.isSuccess;
  const addressError = !!sendError && /address/i.test(sendError);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask them to join your list</CardTitle>
        <CardDescription>
          Nobody from this file is on your email list yet. Send one invite email
          to the people who were subscribed on the old site. Only those who
          click join are added.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            People who will get the invite
          </p>
          {audience.isPending ? (
            <p className="text-2xl font-bold">…</p>
          ) : count !== null ? (
            <p className="text-2xl font-bold tabular-nums">
              {count.toLocaleString()}
            </p>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums">
                {eligible.toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                From this file&apos;s counts. We couldn&apos;t check the exact
                number just now ({audience.error?.message ?? "unknown error"}
                ). It is re-checked when you send.
              </p>
            </>
          )}
          <p className="text-muted-foreground mt-2 text-xs">
            Anyone who has since joined, unsubscribed or been blocked from
            marketing email is left out automatically.
          </p>
        </div>

        {!hasPostalAddress && (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Business address needed</AlertTitle>
            <AlertDescription>
              Add a full mailing address before sending: a street, city, and
              state or ZIP, or a PO box. The law requires a postal address in
              marketing emails.{" "}
              <Link
                href={SETTINGS_PATH}
                className="font-medium underline underline-offset-2"
              >
                Go to business settings
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {nobodyToInvite && (
          <Alert>
            <AlertDescription>
              There is nobody to invite from this import. Only new contacts
              marked as subscribed in the file can be invited.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="invite-subject">Subject</Label>
          <Input
            id="invite-subject"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`Still want to hear from ${businessName}?`}
          />
          <p className="text-muted-foreground text-xs">
            Leave blank to use the suggestion above.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-note">Note from the owner (optional)</Label>
          <Textarea
            id="invite-note"
            value={note}
            maxLength={2000}
            rows={4}
            onChange={(e) => setNote(e.target.value)}
            placeholder="We've moved to a new website. If you'd like to keep getting our news, just tap the button below."
          />
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="invite-attest"
            checked={attested}
            onCheckedChange={(checked) => setAttested(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="invite-attest"
            className="cursor-pointer text-sm leading-snug font-normal"
          >
            {CONTACT_IMPORT_ATTESTATION_WORDING}
          </Label>
        </div>

        <Alert>
          <AlertDescription>
            This is a one-time send for this import. There are no reminders, and
            it can&apos;t be sent again. Everyone gets an unsubscribe link and
            your business address.
          </AlertDescription>
        </Alert>

        {sendError && (
          <Alert variant="destructive" role="alert">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>The invite wasn&apos;t sent</AlertTitle>
            <AlertDescription>
              {sendError}
              {addressError && (
                <>
                  {" "}
                  <Link
                    href={SETTINGS_PATH}
                    className="font-medium underline underline-offset-2"
                  >
                    Go to business settings
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            disabled={!canSend}
            onClick={() => {
              setSendError(null);
              queueInvite.mutate({
                importId,
                subject: subject.trim() || undefined,
                note: note.trim() || undefined,
                attested: true,
              });
            }}
          >
            {queueInvite.isPending ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Sending…
              </>
            ) : (
              <>
                <Send aria-hidden="true" className="mr-2 h-4 w-4" />
                Send the invite
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
