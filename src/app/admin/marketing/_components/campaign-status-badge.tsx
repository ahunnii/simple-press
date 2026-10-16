import { AlertTriangle, Loader2 } from "lucide-react";

import type {
  CampaignRecipientStatus,
  CampaignStatus,
} from "~/lib/marketing/campaign-status";
import {
  CAMPAIGN_RECIPIENT_STATUS_LABELS,
  CAMPAIGN_RECIPIENT_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUSES,
} from "~/lib/marketing/campaign-status";
import { Badge } from "~/components/ui/badge";

type Variant = "success" | "secondary" | "warning" | "destructive" | "outline";

/**
 * Same vocabulary the Invoices / Forms badges use: `success` is the terminal
 * good state (Sent), `secondary` is quiet/unfinished (Draft), `outline` is
 * parked or neutral (Queued, Canceled), `warning` is in-flight work that is
 * still moving (Sending), `destructive` is what an owner scans for (Failed).
 */
const CAMPAIGN_VARIANT: Record<CampaignStatus, Variant> = {
  DRAFT: "secondary",
  QUEUED: "outline",
  SENDING: "warning",
  SENT: "success",
  FAILED: "destructive",
  CANCELED: "outline",
};

const RECIPIENT_VARIANT: Record<CampaignRecipientStatus, Variant> = {
  PENDING: "outline",
  SENDING: "warning",
  SENT: "secondary",
  DELIVERED: "success",
  BOUNCED: "destructive",
  COMPLAINED: "destructive",
  FAILED: "destructive",
  SKIPPED: "outline",
  CANCELED: "outline",
};

const KNOWN_CAMPAIGN: readonly string[] = CAMPAIGN_STATUSES;
const KNOWN_RECIPIENT: readonly string[] = CAMPAIGN_RECIPIENT_STATUSES;

/** `status` is a plain string column, so an unknown value renders as-is. */
export function CampaignStatusBadge({ status }: { status: string }) {
  if (!KNOWN_CAMPAIGN.includes(status)) {
    return <Badge variant="outline">{status}</Badge>;
  }
  const known = status as CampaignStatus;
  return (
    <Badge variant={CAMPAIGN_VARIANT[known]}>
      {known === "SENDING" && (
        <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
      )}
      {known === "FAILED" && (
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
      )}
      {CAMPAIGN_STATUS_LABELS[known]}
    </Badge>
  );
}

export function RecipientStatusBadge({ status }: { status: string }) {
  if (!KNOWN_RECIPIENT.includes(status)) {
    return <Badge variant="outline">{status}</Badge>;
  }
  const known = status as CampaignRecipientStatus;
  return (
    <Badge variant={RECIPIENT_VARIANT[known]}>
      {CAMPAIGN_RECIPIENT_STATUS_LABELS[known]}
    </Badge>
  );
}
