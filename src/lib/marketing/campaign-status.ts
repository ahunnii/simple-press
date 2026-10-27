/**
 * Status values for the email-campaign tables. They are stored as plain String
 * columns (the repo's habit for status-like columns), so these unions are the
 * single place the allowed values live. Client-safe: no server imports, so the
 * admin UI can share them.
 */

/** `MarketingCampaign.status` */
export const CAMPAIGN_STATUSES = [
  "DRAFT",
  /** Waiting for `scheduledAt`; the cron sweep queues it when due. */
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "SENT",
  "FAILED",
  "CANCELED",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * Campaigns the sender still has work for (the cron resumes these).
 * SCHEDULED is deliberately not here: it has no recipients or batches yet.
 */
export const ACTIVE_CAMPAIGN_STATUSES = [
  "QUEUED",
  "SENDING",
] as const satisfies readonly CampaignStatus[];

/**
 * `MarketingCampaign.kind`. STANDARD = an owner-composed campaign to opted-in
 * customers (the composer's only kind). REPERMISSION = a contact import's
 * one-time "still want to hear from us?" invite (`./repermission-invite.ts`):
 * fixed content, its own audience (`repermissionAudienceWhere`), and never
 * edited, duplicated, scheduled or re-sent through the composer.
 */
export const CAMPAIGN_KINDS = ["STANDARD", "REPERMISSION"] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

/** `MarketingCampaignBatch.status` */
export const CAMPAIGN_BATCH_STATUSES = [
  "PENDING",
  "SENDING",
  "SENT",
  "FAILED",
  "CANCELED",
] as const;
export type CampaignBatchStatus = (typeof CAMPAIGN_BATCH_STATUSES)[number];

/**
 * `MarketingCampaignRecipient.status`.
 *
 * - PENDING: snapshotted at queue time, its batch not yet claimed.
 * - SENDING: frozen into its batch's payload (first claim); the send is in
 *   flight or waiting on a retry.
 * - SENT → DELIVERED → BOUNCED → COMPLAINED: provider outcomes; webhooks only
 *   ever move a row forward through these.
 * - FAILED: the provider rejected it, or the batch gave up.
 * - SKIPPED: no longer in the audience (unsubscribed, suppressed, anonymized)
 *   when its batch was first claimed.
 * - CANCELED: the owner canceled the campaign before its batch went out.
 */
export const CAMPAIGN_RECIPIENT_STATUSES = [
  "PENDING",
  "SENDING",
  "SENT",
  "DELIVERED",
  "BOUNCED",
  "COMPLAINED",
  "FAILED",
  "SKIPPED",
  "CANCELED",
] as const;
export type CampaignRecipientStatus =
  (typeof CAMPAIGN_RECIPIENT_STATUSES)[number];

/** Recipient statuses meaning "the provider accepted this email". */
export const ACCEPTED_RECIPIENT_STATUSES = [
  "SENT",
  "DELIVERED",
  "BOUNCED",
  "COMPLAINED",
] as const satisfies readonly CampaignRecipientStatus[];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  QUEUED: "Queued",
  SENDING: "Sending",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELED: "Canceled",
};

export const CAMPAIGN_RECIPIENT_STATUS_LABELS: Record<
  CampaignRecipientStatus,
  string
> = {
  PENDING: "Waiting",
  SENDING: "Sending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  BOUNCED: "Bounced",
  COMPLAINED: "Marked as spam",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  CANCELED: "Canceled",
};
