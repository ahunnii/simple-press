"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import type { RewardsPageTemplateProps } from "../../_templates/types";
import type {
  LoyaltyLedgerType,
  LoyaltySocialNetwork,
} from "~/lib/loyalty/constants";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { LOYALTY_LEDGER_TYPE_LABELS } from "~/lib/loyalty/constants";
import { describeTierReward } from "~/lib/loyalty/settings";
import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

/**
 * Loyalty Rewards — shared account-page content.
 *
 * Mirrors the split in `address-components.tsx`: `useRewardsActions()` owns
 * every mutation (toast + `router.refresh()` so the server-fetched `rewards`
 * prop is refetched after a write), `RewardsContent` is the default,
 * design-token-only UI, and a set of small pure helpers below are exported so
 * `OliveRewardsPage` (and any future template-specific page) can re-skin the
 * markup without re-deriving the same logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RewardsData = RewardsPageTemplateProps["rewards"];
export type RewardsProgram = NonNullable<RewardsData["program"]>;
export type RewardsTier = RewardsProgram["tiers"][number];
export type RewardsCode = RewardsData["codes"][number];
export type RewardsEntry = RewardsData["entries"][number];
export type RewardsSocial = RewardsData["social"][number];

type RedeemResult = RouterOutputs["loyalty"]["redeem"];
export type LastRedeemed = Pick<
  RedeemResult,
  "code" | "rewardLabel" | "expiresAt"
> | null;

// ---------------------------------------------------------------------------
// Pure helpers — logic only, no markup. Shared by every template's page.
// ---------------------------------------------------------------------------

/** Whether this customer has ever joined the program (has a Customer row with `loyaltyJoinedAt`). */
export function hasJoined(rewards: RewardsData): boolean {
  return !!rewards.customer?.loyaltyJoinedAt;
}

/** Sub-text for the "Join rewards" button, or `null` when there's no signup bonus to mention. */
export function signupBonusNote(rules: RewardsProgram["rules"]): string | null {
  if (rules.signupEnabled && rules.signupBonus > 0) {
    return `Join now and get ${rules.signupBonus} points`;
  }
  return null;
}

/**
 * Plain-text "how to earn" bullets from the program rules. Social-follow
 * rows are NOT included here — they need per-network claim state, so they're
 * rendered as their own list from `rewards.social`.
 */
export function earnRules(rules: RewardsProgram["rules"]): string[] {
  const lines: string[] = [];
  if (rules.earnOnOrders && rules.pointsPerDollar > 0) {
    lines.push(
      `Earn ${rules.pointsPerDollar} point${rules.pointsPerDollar === 1 ? "" : "s"} per $1 spent`,
    );
  }
  if (rules.firstOrderEnabled && rules.firstOrderBonus > 0) {
    lines.push(`Get ${rules.firstOrderBonus} bonus points on your first order`);
  }
  if (rules.birthdayEnabled && rules.birthdayBonus > 0) {
    lines.push(`Get ${rules.birthdayBonus} points on your birthday each year`);
  }
  return lines;
}

/**
 * Why a redemption tier's button should be disabled, or `null` when it's
 * redeemable right now. Checked in order: not joined, insufficient balance,
 * coupons feature off (redemption is a discount code under the hood), the
 * loyalty flag itself paused. Only one reason is ever shown at a time.
 */
export function tierDisabledReason(
  rewards: RewardsData,
  tier: RewardsTier,
): string | null {
  if (!hasJoined(rewards)) {
    return "Join rewards to redeem";
  }
  const balance = rewards.customer?.loyaltyPoints ?? 0;
  if (balance < tier.pointsCost) {
    return `You need ${tier.pointsCost - balance} more points`;
  }
  if (!rewards.flags.coupons) {
    return "Redemption is temporarily unavailable";
  }
  if (!rewards.flags.loyalty) {
    return "Rewards are paused right now";
  }
  return null;
}

/** Minimum-purchase note for a tier, or `null` when the tier has no minimum. */
export function tierMinPurchaseNote(tier: RewardsTier): string | null {
  return tier.minPurchase !== null
    ? `Minimum purchase ${formatPrice(tier.minPurchase)}`
    : null;
}

export type RewardCodeStatus = "active" | "used" | "expired" | "inactive";

/**
 * A reward code's display status. Priority mirrors the admin customer detail
 * page's `CodeStatusBadge` (`customer-loyalty-card.tsx`): a deactivated code
 * is "Inactive" even if it was also used or has since expired, a used code is
 * "Used" even past its expiry date, and only then does expiry matter.
 */
export function rewardCodeStatus(
  code: RewardsCode,
  now: number = Date.now(),
): RewardCodeStatus {
  if (!code.active) return "inactive";
  if (code.usageCount >= 1) return "used";
  if (code.expiresAt && code.expiresAt.getTime() < now) return "expired";
  return "active";
}

export const REWARD_CODE_STATUS_LABEL: Record<RewardCodeStatus, string> = {
  active: "Active",
  used: "Used",
  expired: "Expired",
  inactive: "Inactive",
};

/** Badge variant per status — mirrors `CodeStatusBadge` in the admin customer detail page. */
export const REWARD_CODE_STATUS_BADGE_VARIANT: Record<
  RewardCodeStatus,
  "success" | "outline" | "destructive" | "secondary"
> = {
  active: "success",
  used: "outline",
  expired: "destructive",
  inactive: "secondary",
};

/** `LoyaltyLedger.type` is a plain `String` column — an unrecognized value falls back to the raw string. */
export function activityLabel(type: string): string {
  const labels: Record<string, string | undefined> = LOYALTY_LEDGER_TYPE_LABELS;
  return labels[type as LoyaltyLedgerType] ?? type;
}

// Year-agnostic month/day formatting — a stored birthday has no year, so a
// scratch leap year (2000) is used purely so Feb 29 formats/counts correctly.
// Mirrors `customer-loyalty-card.tsx`'s `formatBirthday`.
const MONTH_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});
const MONTH_NAME_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long" });

export function formatBirthday(month: number, day: number): string {
  return MONTH_DAY_FORMAT.format(new Date(2000, month - 1, day));
}

/** Number of days in `month` (1–12), allowing 29 for February since the birthday repeats every year. */
export function daysInMonth(month: number): number {
  return new Date(2000, month, 0).getDate();
}

export const MONTH_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: 12 },
  (_, i) => ({
    value: i + 1,
    label: MONTH_NAME_FORMAT.format(new Date(2000, i, 1)),
  }),
);

// ---------------------------------------------------------------------------
// Actions hook
// ---------------------------------------------------------------------------

/**
 * Wraps the four customer-facing loyalty mutations with toast feedback and a
 * `router.refresh()` so the server-fetched `rewards` prop is re-read after a
 * successful write (same pattern as `PreferencesContent`/`AddressSheet`).
 * tRPC error messages are surfaced verbatim via `toast.error`.
 */
export function useRewardsActions() {
  const router = useRouter();
  const [lastRedeemed, setLastRedeemed] = useState<LastRedeemed>(null);

  const joinMutation = api.loyalty.join.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.awarded > 0
          ? `Welcome! You earned ${data.awarded} points for joining.`
          : "Welcome to the rewards program.",
      );
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to join rewards.");
    },
  });

  const claimSocialMutation = api.loyalty.claimSocial.useMutation({
    onSuccess: (data) => {
      toast.success(`You earned ${data.awarded} points.`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to claim points.");
    },
  });

  const redeemMutation = api.loyalty.redeem.useMutation({
    onSuccess: (data) => {
      setLastRedeemed({
        code: data.code,
        rewardLabel: data.rewardLabel,
        expiresAt: data.expiresAt,
      });
      toast.success("Reward redeemed.");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to redeem reward.");
    },
  });

  const birthdayMutation = api.loyalty.updateBirthday.useMutation({
    onSuccess: () => {
      toast.success("Birthday saved.");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save birthday.");
    },
  });

  async function copyCode(code: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Copying isn't supported in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Failed to copy code.");
    }
  }

  return {
    join: () => joinMutation.mutate(),
    claimSocial: (network: LoyaltySocialNetwork) =>
      claimSocialMutation.mutate({ network }),
    redeem: (tierId: string) => redeemMutation.mutate({ tierId }),
    updateBirthday: (month: number, day: number) =>
      birthdayMutation.mutate({ month, day }),
    pending: {
      join: joinMutation.isPending,
      claimSocial: claimSocialMutation.isPending
        ? (claimSocialMutation.variables?.network ?? null)
        : null,
      redeem: redeemMutation.isPending
        ? (redeemMutation.variables?.tierId ?? null)
        : null,
      birthday: birthdayMutation.isPending,
    },
    lastRedeemed,
    copyCode,
  };
}

export type RewardsActions = ReturnType<typeof useRewardsActions>;

// ---------------------------------------------------------------------------
// Default UI
// ---------------------------------------------------------------------------

function RedeemTierCard({
  rewards,
  tier,
  actions,
  confirmingTierId,
  onRequestConfirm,
  onCancelConfirm,
}: {
  rewards: RewardsData;
  tier: RewardsTier;
  actions: RewardsActions;
  confirmingTierId: string | null;
  onRequestConfirm: (tierId: string) => void;
  onCancelConfirm: () => void;
}) {
  const disabledReason = tierDisabledReason(rewards, tier);
  const minPurchaseNote = tierMinPurchaseNote(tier);
  const isPending = actions.pending.redeem === tier.id;
  const isConfirming = confirmingTierId === tier.id;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border p-4">
      <p className="text-foreground font-medium">{tier.label}</p>
      <p className="text-muted-foreground text-sm">
        {describeTierReward(tier)}
      </p>
      <p className="text-sm font-medium">{tier.pointsCost} points</p>
      {minPurchaseNote && (
        <p className="text-muted-foreground text-xs">{minPurchaseNote}</p>
      )}

      <div className="mt-2">
        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              Confirm: spend {tier.pointsCost} points?
            </span>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => actions.redeem(tier.id)}
            >
              {isPending ? "Redeeming…" : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelConfirm}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Button
              size="sm"
              disabled={!!disabledReason || isPending}
              onClick={() => onRequestConfirm(tier.id)}
            >
              Redeem
            </Button>
            {disabledReason && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                {disabledReason}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The complete rewards page body: balance, ways to earn, redemption tiers,
 * reward codes, birthday bonus and recent activity. Design-token classes
 * only (`bg-card`/`border`/`text-muted-foreground`/etc.), so it renders
 * correctly inside every template — this is the component every template
 * without its own rewards page falls back to via the registry.
 */
export function RewardsContent({ rewards }: { rewards: RewardsData }) {
  const actions = useRewardsActions();
  const [confirmingTierId, setConfirmingTierId] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState(
    rewards.customer?.birthMonth ?? 1,
  );
  const [birthDay, setBirthDay] = useState(rewards.customer?.birthDay ?? 1);

  if (!rewards.program) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground text-sm">
          This store hasn&apos;t set up a rewards program yet.
        </p>
      </div>
    );
  }

  const program = rewards.program;
  const rules = program.rules;
  const joined = hasJoined(rewards);
  const balance = rewards.customer?.loyaltyPoints ?? 0;
  const readOnly = !rewards.flags.loyalty;
  const earnLines = earnRules(rules);
  const showSocial =
    rules.socialEnabled &&
    rules.socialFollowBonus > 0 &&
    rewards.social.length > 0;
  const showBirthday = rules.birthdayEnabled && rules.birthdayBonus > 0;
  const maxDay = daysInMonth(birthMonth);

  return (
    <div className="max-w-2xl space-y-6">
      {readOnly && (
        <div
          role="status"
          className="border-border bg-muted rounded-lg border p-4 text-sm"
        >
          Rewards are paused right now. Your balance is safe and you&apos;ll be
          able to earn and redeem again when the program is back.
        </div>
      )}

      {/* Balance hero */}
      <div className="rounded-lg border p-6">
        <h2 className="text-foreground font-semibold">Your balance</h2>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums">{balance}</span>
          <span className="text-muted-foreground text-sm">points</span>
        </div>
        {!joined && (
          <div className="mt-4">
            <Button
              size="sm"
              disabled={readOnly || actions.pending.join}
              onClick={() => actions.join()}
            >
              {actions.pending.join ? "Joining…" : "Join rewards"}
            </Button>
            {signupBonusNote(rules) && (
              <p className="text-muted-foreground mt-2 text-sm">
                {signupBonusNote(rules)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="rounded-lg border p-6">
        <h2 className="text-foreground font-semibold">How to earn points</h2>
        {earnLines.length === 0 && !showSocial ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Check back soon for ways to earn points.
          </p>
        ) : (
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5 text-sm">
            {earnLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {showSocial && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-foreground text-sm font-medium">
              Follow us and earn {rules.socialFollowBonus} points each
            </p>
            {rewards.social.map((s) => (
              <div
                key={s.network}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  {s.label}
                </a>
                {s.claimed ? (
                  <Badge variant="secondary">Claimed</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !joined ||
                      readOnly ||
                      actions.pending.claimSocial === s.network
                    }
                    onClick={() => actions.claimSocial(s.network)}
                  >
                    {actions.pending.claimSocial === s.network
                      ? "Claiming…"
                      : `Claim ${rules.socialFollowBonus} points`}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redeem */}
      {program.tiers.length > 0 && (
        <div className="rounded-lg border p-6">
          <h2 className="text-foreground font-semibold">Redeem your points</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {program.tiers.map((tier) => (
              <RedeemTierCard
                key={tier.id}
                rewards={rewards}
                tier={tier}
                actions={actions}
                confirmingTierId={confirmingTierId}
                onRequestConfirm={setConfirmingTierId}
                onCancelConfirm={() => setConfirmingTierId(null)}
              />
            ))}
          </div>

          {actions.lastRedeemed && (
            <div className="bg-primary/5 border-primary/20 mt-4 rounded-lg border p-4">
              <p className="text-foreground text-sm font-medium">
                {actions.lastRedeemed.rewardLabel} redeemed
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                  {actions.lastRedeemed.code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void actions.copyCode(actions.lastRedeemed!.code)
                  }
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Copy
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                We also emailed it to you. Paste it in the discount field at
                checkout.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reward codes */}
      <div className="rounded-lg border p-6">
        <h2 className="text-foreground font-semibold">Your reward codes</h2>
        {rewards.codes.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">No codes yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {rewards.codes.map((code) => {
              const status = rewardCodeStatus(code);
              return (
                <li
                  key={code.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                >
                  <div>
                    <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                      {code.code}
                    </code>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {code.reason}
                      {code.expiresAt
                        ? ` · Expires ${formatDate(code.expiresAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={REWARD_CODE_STATUS_BADGE_VARIANT[status]}>
                      {REWARD_CODE_STATUS_LABEL[status]}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void actions.copyCode(code.code)}
                      aria-label={`Copy code ${code.code}`}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Copy
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Birthday */}
      {showBirthday && (
        <div className="rounded-lg border p-6">
          <h2 className="text-foreground font-semibold">Birthday bonus</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Get {rules.birthdayBonus} points on your birthday each year.
          </p>
          {rewards.customer?.birthMonth != null &&
            rewards.customer.birthDay != null && (
              <p className="text-foreground mt-2 text-sm font-medium">
                Saved:{" "}
                {formatBirthday(
                  rewards.customer.birthMonth,
                  rewards.customer.birthDay,
                )}
              </p>
            )}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Month</span>
              <select
                className="border-input bg-background h-9 rounded-[var(--radius)] border px-3 text-sm"
                value={birthMonth}
                disabled={!joined || readOnly}
                onChange={(e) => {
                  const month = Number(e.target.value);
                  setBirthMonth(month);
                  const max = daysInMonth(month);
                  if (birthDay > max) setBirthDay(max);
                }}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Day</span>
              <select
                className="border-input bg-background h-9 rounded-[var(--radius)] border px-3 text-sm"
                value={birthDay}
                disabled={!joined || readOnly}
                onChange={(e) => setBirthDay(Number(e.target.value))}
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={!joined || readOnly || actions.pending.birthday}
              onClick={() => actions.updateBirthday(birthMonth, birthDay)}
            >
              {actions.pending.birthday ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="rounded-lg border p-6">
        <h2 className="text-foreground font-semibold">Recent activity</h2>
        {rewards.entries.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {rewards.entries.slice(0, 20).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0"
              >
                <div>
                  <p className="text-foreground">{activityLabel(entry.type)}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      entry.points >= 0
                        ? "text-foreground font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {entry.points >= 0 ? `+${entry.points}` : entry.points}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Balance: {entry.balanceAfter}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
