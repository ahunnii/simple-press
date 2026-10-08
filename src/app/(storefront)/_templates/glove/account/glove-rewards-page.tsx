"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import type { RewardsPageTemplateProps } from "../../types";
import type { GloveStatusTone } from "./glove-account-ui";
import type {
  RewardsActions,
  RewardsData,
  RewardsTier,
} from "~/app/(storefront)/_components/account/rewards-content";
import { formatDate } from "~/lib/format-date";
import { describeTierReward } from "~/lib/loyalty/settings";
import { cn } from "~/lib/utils";
import {
  activityLabel,
  daysInMonth,
  earnRules,
  formatBirthday,
  hasJoined,
  MONTH_OPTIONS,
  REWARD_CODE_STATUS_LABEL,
  rewardCodeStatus,
  signupBonusNote,
  tierDisabledReason,
  tierMinPurchaseNote,
  useRewardsActions,
} from "~/app/(storefront)/_components/account/rewards-content";

import { GloveButton } from "../shared/glove-button";
import { GloveSelect } from "../shared/glove-input";
import { GloveRevealGroup } from "../shared/glove-reveal";
import { gloveRevealItemStyle } from "../shared/glove-reveal-style";
import { GloveAccountLayout } from "./glove-account-layout";
import {
  GloveAccountCard,
  GloveAccountEmpty,
  GloveCardHeading,
  GloveStatusBadge,
} from "./glove-account-ui";

const CODE_TONE: Record<string, GloveStatusTone> = {
  active: "success",
  used: "muted",
  expired: "alert",
  inactive: "muted",
};

const CODE_CHIP =
  "rounded-[3px] bg-[var(--glove-cloud)] px-2 py-1 font-mono text-[14px] text-[var(--glove-ink)]";

/**
 * The points tally: a purple medallion holding the balance. Local on purpose:
 * the shared medallion tops out at 64px, too small for a four-digit tally.
 */
function PointsMedallion({ balance }: { balance: number }) {
  return (
    <div
      className="glove-display flex size-[132px] shrink-0 flex-col items-center justify-center rounded-full bg-[var(--glove-primary)] text-[var(--glove-on-primary)] shadow-[0_0_0_6px_var(--glove-primary-tint)]"
      role="img"
      aria-label={`${balance} points`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "leading-none font-semibold tabular-nums",
          balance >= 10000 ? "text-[34px]" : "text-[44px]",
        )}
      >
        {balance.toLocaleString("en-US")}
      </span>
      <span
        aria-hidden="true"
        className="mt-1 text-[11px] font-medium tracking-[0.12em] uppercase"
      >
        points
      </span>
    </div>
  );
}

/** How far the next unreached tier is, or null when every tier is within reach. */
function nextTierNote(tiers: RewardsTier[], balance: number): string | null {
  const next = [...tiers]
    .filter((t) => t.pointsCost > balance)
    .sort((a, b) => a.pointsCost - b.pointsCost)[0];
  if (!next) return null;
  const gap = next.pointsCost - balance;
  return `${gap} more ${gap === 1 ? "point" : "points"} to unlock ${next.label}`;
}

function RedeemTier({
  rewards,
  tier,
  actions,
  confirming,
  onRequestConfirm,
  onCancelConfirm,
}: {
  rewards: RewardsData;
  tier: RewardsTier;
  actions: RewardsActions;
  confirming: boolean;
  onRequestConfirm: () => void;
  onCancelConfirm: () => void;
}) {
  const disabledReason = tierDisabledReason(rewards, tier);
  const minPurchaseNote = tierMinPurchaseNote(tier);
  const isPending = actions.pending.redeem === tier.id;

  return (
    <li className="flex flex-col gap-1.5 rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] p-4">
      <p className="glove-display text-[16px] leading-snug font-medium text-[var(--glove-ink)]">
        {tier.label}
      </p>
      <p className="text-[14px] text-[var(--glove-text)]">
        {describeTierReward(tier)}
      </p>
      <p className="glove-body text-[15px] font-bold text-[var(--glove-primary)]">
        {tier.pointsCost} points
      </p>
      {minPurchaseNote ? (
        <p className="text-[13px] text-[var(--glove-muted)]">
          {minPurchaseNote}
        </p>
      ) : null}
      <div className="mt-2">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-[var(--glove-ink)]">
              Spend {tier.pointsCost} points?
            </span>
            <GloveButton
              variant="woo"
              size="sm"
              disabled={isPending}
              onClick={() => actions.redeem(tier.id)}
            >
              {isPending ? "Redeeming…" : "Confirm"}
            </GloveButton>
            <GloveButton
              variant="wooOutline"
              size="sm"
              onClick={onCancelConfirm}
            >
              Cancel
            </GloveButton>
          </div>
        ) : (
          <>
            <GloveButton
              variant="woo"
              size="sm"
              disabled={!!disabledReason || isPending}
              onClick={onRequestConfirm}
            >
              Redeem
              <span className="sr-only"> {tier.label}</span>
            </GloveButton>
            {disabledReason ? (
              <p className="mt-1.5 text-[13px] text-[var(--glove-muted)]">
                {disabledReason}
              </p>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

function CopyButton({
  code,
  actions,
}: {
  code: string;
  actions: RewardsActions;
}) {
  return (
    <GloveButton
      variant="wooOutline"
      size="sm"
      onClick={() => void actions.copyCode(code)}
      aria-label={`Copy code ${code}`}
    >
      <Copy className="size-3.5" aria-hidden="true" />
      Copy
    </GloveButton>
  );
}

/**
 * Rewards: the loyalty program inside the shared account layout. A purple
 * medallion carries the points tally, followed by ways to earn, redemption
 * tiers, codes, the birthday bonus and recent activity. All behavior comes
 * from the shared `useRewardsActions` hook and helpers.
 */
export function GloveRewardsPage({ rewards }: RewardsPageTemplateProps) {
  const actions = useRewardsActions();
  const [confirmingTierId, setConfirmingTierId] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState(
    rewards.customer?.birthMonth ?? 1,
  );
  const [birthDay, setBirthDay] = useState(rewards.customer?.birthDay ?? 1);

  if (!rewards.program) {
    return (
      <GloveAccountLayout heading="Rewards">
        <GloveAccountEmpty
          heading="No rewards program yet"
          body="This store hasn't set up a rewards program yet. Check back soon."
          cta={{ label: "Shop now", href: "/shop" }}
        />
      </GloveAccountLayout>
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
  const tierNote = joined ? nextTierNote(program.tiers, balance) : null;
  const bonusNote = signupBonusNote(rules);

  let order = 0;
  const reveal = () => ({
    className: "glove-reveal-item",
    style: gloveRevealItemStyle(order++),
  });

  return (
    <GloveAccountLayout heading="Rewards">
      <GloveRevealGroup threshold={0} className="flex max-w-3xl flex-col gap-5">
        {readOnly ? (
          <p
            role="status"
            className="rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] p-4 text-[14px] text-[var(--glove-ink)]"
          >
            Rewards are paused right now. Your balance is safe and you&apos;ll
            be able to earn and redeem again when the program is back.
          </p>
        ) : null}

        {/* Tally */}
        <GloveAccountCard {...reveal()}>
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <PointsMedallion balance={balance} />
            <div className="min-w-0">
              <GloveCardHeading>Your balance</GloveCardHeading>
              {joined ? (
                <p className="mt-2 text-[15px] text-[var(--glove-text)]">
                  {tierNote ?? "You can redeem any reward below."}
                </p>
              ) : (
                <div className="mt-2">
                  <p className="text-[15px] text-[var(--glove-text)]">
                    {bonusNote ?? "Join to start earning points."}
                  </p>
                  <GloveButton
                    variant="woo"
                    className="mt-4"
                    disabled={readOnly || actions.pending.join}
                    onClick={() => actions.join()}
                  >
                    {actions.pending.join ? "Joining…" : "Join rewards"}
                  </GloveButton>
                </div>
              )}
            </div>
          </div>
        </GloveAccountCard>

        {/* How to earn */}
        <GloveAccountCard {...reveal()}>
          <GloveCardHeading>How to earn points</GloveCardHeading>
          {earnLines.length === 0 && !showSocial ? (
            <p className="mt-2 text-[14px] text-[var(--glove-muted)]">
              Check back soon for ways to earn points.
            </p>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {earnLines.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-[15px] text-[var(--glove-text)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[9px] size-2 shrink-0 rounded-full bg-[var(--glove-primary)]"
                  />
                  {line}
                </li>
              ))}
            </ul>
          )}

          {showSocial ? (
            <div className="mt-5 flex flex-col gap-3 border-t border-[var(--glove-line)] pt-5">
              <p className="glove-display text-[14px] font-medium text-[var(--glove-ink)]">
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
                    className="text-[15px] text-[var(--glove-primary)] underline underline-offset-4 hover:text-[var(--glove-primary-hover)]"
                  >
                    {s.label}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                  {s.claimed ? (
                    <GloveStatusBadge label="Claimed" tone="muted" />
                  ) : (
                    <GloveButton
                      variant="wooOutline"
                      size="sm"
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
                    </GloveButton>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </GloveAccountCard>

        {/* Redeem */}
        {program.tiers.length > 0 ? (
          <GloveAccountCard {...reveal()}>
            <GloveCardHeading>Redeem your points</GloveCardHeading>
            <ul className="m-0 mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
              {program.tiers.map((tier) => (
                <RedeemTier
                  key={tier.id}
                  rewards={rewards}
                  tier={tier}
                  actions={actions}
                  confirming={confirmingTierId === tier.id}
                  onRequestConfirm={() => setConfirmingTierId(tier.id)}
                  onCancelConfirm={() => setConfirmingTierId(null)}
                />
              ))}
            </ul>

            {actions.lastRedeemed ? (
              <div
                role="status"
                className="mt-4 rounded-[var(--glove-radius-card)] border border-[var(--glove-primary)] p-4"
              >
                <p className="glove-display text-[15px] font-medium text-[var(--glove-ink)]">
                  {actions.lastRedeemed.rewardLabel} redeemed
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className={CODE_CHIP}>{actions.lastRedeemed.code}</code>
                  <CopyButton
                    code={actions.lastRedeemed.code}
                    actions={actions}
                  />
                </div>
                <p className="mt-2 text-[13px] text-[var(--glove-muted)]">
                  We also emailed it to you. Paste it in the discount field at
                  checkout.
                </p>
              </div>
            ) : null}
          </GloveAccountCard>
        ) : null}

        {/* Reward codes */}
        <GloveAccountCard {...reveal()}>
          <GloveCardHeading>Your reward codes</GloveCardHeading>
          {rewards.codes.length === 0 ? (
            <p className="mt-2 text-[14px] text-[var(--glove-muted)]">
              No codes yet.
            </p>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col p-0">
              {rewards.codes.map((code) => {
                const status = rewardCodeStatus(code);
                return (
                  <li
                    key={code.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glove-line)] py-3 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <code className={CODE_CHIP}>{code.code}</code>
                      <p className="mt-1 text-[13px] text-[var(--glove-muted)]">
                        {code.reason}
                        {code.expiresAt
                          ? ` · Expires ${formatDate(code.expiresAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GloveStatusBadge
                        label={REWARD_CODE_STATUS_LABEL[status]}
                        tone={CODE_TONE[status] ?? "muted"}
                      />
                      <CopyButton code={code.code} actions={actions} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GloveAccountCard>

        {/* Birthday */}
        {/* The birthday controls are a form: kept out of the reveal. */}
        {showBirthday ? (
          <GloveAccountCard>
            <GloveCardHeading>Birthday bonus</GloveCardHeading>
            <p className="mt-1 text-[14px] text-[var(--glove-text)]">
              Get {rules.birthdayBonus} points on your birthday each year.
            </p>
            {rewards.customer?.birthMonth != null &&
            rewards.customer.birthDay != null ? (
              <p className="mt-2 text-[14px] font-bold text-[var(--glove-ink)]">
                Saved:{" "}
                {formatBirthday(
                  rewards.customer.birthMonth,
                  rewards.customer.birthDay,
                )}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="flex min-w-[10rem] flex-col gap-1.5">
                <label
                  htmlFor="glove-birth-month"
                  className="text-[14px] font-bold text-[var(--glove-ink)]"
                >
                  Month
                </label>
                <GloveSelect
                  id="glove-birth-month"
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
                </GloveSelect>
              </div>
              <div className="flex w-28 flex-col gap-1.5">
                <label
                  htmlFor="glove-birth-day"
                  className="text-[14px] font-bold text-[var(--glove-ink)]"
                >
                  Day
                </label>
                <GloveSelect
                  id="glove-birth-day"
                  value={birthDay}
                  disabled={!joined || readOnly}
                  onChange={(e) => setBirthDay(Number(e.target.value))}
                >
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </GloveSelect>
              </div>
              <GloveButton
                variant="woo"
                disabled={!joined || readOnly || actions.pending.birthday}
                onClick={() => actions.updateBirthday(birthMonth, birthDay)}
              >
                {actions.pending.birthday ? "Saving…" : "Save"}
              </GloveButton>
            </div>
          </GloveAccountCard>
        ) : null}

        {/* Recent activity */}
        <GloveAccountCard {...reveal()}>
          <GloveCardHeading>Recent activity</GloveCardHeading>
          {rewards.entries.length === 0 ? (
            <p className="mt-2 text-[14px] text-[var(--glove-muted)]">
              No activity yet.
            </p>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col p-0">
              {rewards.entries.slice(0, 20).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--glove-line)] py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-[15px] text-[var(--glove-ink)]">
                      {activityLabel(entry.type)}
                    </p>
                    <p className="text-[13px] text-[var(--glove-muted)]">
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "glove-body text-[15px] font-bold",
                        entry.points >= 0
                          ? "text-[var(--glove-success)]"
                          : "text-[var(--glove-alert)]",
                      )}
                    >
                      {entry.points >= 0 ? `+${entry.points}` : entry.points}
                    </p>
                    <p className="text-[13px] text-[var(--glove-muted)]">
                      Balance: {entry.balanceAfter}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GloveAccountCard>
      </GloveRevealGroup>
    </GloveAccountLayout>
  );
}
