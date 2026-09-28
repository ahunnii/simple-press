"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { Copy } from "lucide-react";

import type { RewardsPageTemplateProps } from "../../types";
import type {
  RewardCodeStatus,
  RewardsActions,
  RewardsData,
  RewardsTier,
} from "~/app/(storefront)/_components/account/rewards-content";
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
import { formatDate } from "~/lib/format-date";
import { describeTierReward } from "~/lib/loyalty/settings";

import { DreamButton } from "../shared/dream-button";
import { DreamSelect } from "../shared/dream-input";
import { DreamRevealGroup } from "../shared/dream-reveal";
import { DreamAccountEmptyState } from "./dream-account-empty-state";
import { DreamAccountLayout } from "./dream-account-layout";
import { dreamStatusStyle } from "./dream-order-status-badge";
import { resolveDreamAccountFields } from "./fields";

const FIELD_KEYS = [
  "dream.global.rewards-empty-heading",
  "dream.global.rewards-empty-body",
];

/** Maps a reward code's status to one of `DreamOrderStatusBadge`'s known
 * palette keys so the pill stays on the same tinted system as Orders and
 * Subscriptions instead of inventing a new one. */
const CODE_STATUS_KEY: Record<RewardCodeStatus, string> = {
  active: "active",
  used: "completed",
  expired: "past_due",
  inactive: "cancelled",
};

function CodeStatusPill({ status }: { status: RewardCodeStatus }) {
  const style = dreamStatusStyle(CODE_STATUS_KEY[status]);
  return (
    <span
      className="inline-flex items-center rounded-[var(--dream-radius-pill)] px-2.5 py-1 text-[12px] font-semibold"
      style={style}
    >
      {REWARD_CODE_STATUS_LABEL[status]}
    </span>
  );
}

function SectionCard({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dream-card">
      <h3 className="m-0 [font-family:var(--font-dream-display)] text-[20px] font-normal text-[var(--dream-ink)]">
        {heading}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

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
    <div className="flex flex-col gap-2 rounded-[var(--dream-radius-input)] border border-[var(--dream-line)] p-4">
      <p className="m-0 text-[15px] font-medium text-[var(--dream-ink)]">
        {tier.label}
      </p>
      <p className="m-0 text-[13px] text-[var(--dream-soft)]">
        {describeTierReward(tier)}
      </p>
      <p className="m-0 text-[13px] font-medium text-[var(--dream-gold-ink)] tabular-nums">
        {tier.pointsCost} points
      </p>
      {minPurchaseNote ? (
        <p className="m-0 text-[12px] text-[var(--dream-soft)]">
          {minPurchaseNote}
        </p>
      ) : null}

      <div className="mt-2">
        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[var(--dream-soft)]">
              Confirm: spend {tier.pointsCost} points?
            </span>
            <DreamButton
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={() => actions.redeem(tier.id)}
            >
              {isPending ? "Redeeming…" : "Confirm"}
            </DreamButton>
            <DreamButton type="button" variant="link" onClick={onCancelConfirm}>
              Cancel
            </DreamButton>
          </div>
        ) : (
          <>
            <DreamButton
              type="button"
              variant="secondary"
              disabled={!!disabledReason || isPending}
              onClick={() => onRequestConfirm(tier.id)}
            >
              Redeem
            </DreamButton>
            {disabledReason ? (
              <p className="m-0 mt-1.5 text-[12px] text-[var(--dream-soft)]">
                {disabledReason}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * dream's rewards page (registry: `RewardsPage`). The pure derived-state
 * helpers (who's disabled and why, a reward code's status, birthday
 * formatting) and the mutation hook come from the shared
 * `rewards-content.tsx` — this file only supplies dream markup (`dream-card`,
 * `DreamButton`, `DreamSelect`, the shared status-pill palette) inside
 * `DreamAccountLayout`, matching how `dream-orders-page.tsx` and
 * `dream-subscriptions-page.tsx` re-skin their own list items rather than
 * relying on the `.dream-account` shadcn bridge (used instead by the thinner
 * Invoices/Settings/Security/Address Book/Preferences skins).
 */
export function DreamRewardsPage({ business, rewards }: RewardsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDreamAccountFields(customFields, FIELD_KEYS);

  const actions = useRewardsActions();
  const [confirmingTierId, setConfirmingTierId] = useState<string | null>(
    null,
  );
  const [birthMonth, setBirthMonth] = useState(
    rewards.customer?.birthMonth ?? 1,
  );
  const [birthDay, setBirthDay] = useState(rewards.customer?.birthDay ?? 1);

  const breadcrumb = [
    { label: "Home", href: "/" },
    { label: "Account", href: "/account/settings" },
    { label: "Rewards" },
  ];

  if (!rewards.program) {
    return (
      <DreamAccountLayout heading="Rewards" breadcrumb={breadcrumb}>
        <DreamAccountEmptyState
          heading={f["dream.global.rewards-empty-heading"] ?? ""}
          body={f["dream.global.rewards-empty-body"] ?? ""}
          ctaLabel=""
          ctaHref=""
        />
      </DreamAccountLayout>
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
  const note = signupBonusNote(rules);

  return (
    <DreamAccountLayout heading="Rewards" breadcrumb={breadcrumb}>
      <DreamRevealGroup className="flex flex-col gap-5">
        {readOnly ? (
          <div
            role="status"
            className="dream-reveal-item rounded-[var(--dream-radius-input)] p-4"
            style={
              {
                "--i": 0,
                background: "var(--dream-sky)",
                border: "1px solid var(--dream-line)",
              } as CSSProperties
            }
          >
            <p className="m-0 text-[13px] text-[var(--dream-soft)]">
              Rewards are paused for now — your balance is safe. You&apos;ll
              be able to earn and redeem again once it&apos;s back on.
            </p>
          </div>
        ) : null}

        {/* Balance hero */}
        <div className="dream-reveal-item" style={{ "--i": 1 } as CSSProperties}>
          <SectionCard heading="Your balance">
            <div className="flex items-baseline gap-2">
              <span className="[font-family:var(--font-dream-display)] text-[48px] leading-none text-[var(--dream-ink)] tabular-nums">
                {balance}
              </span>
              <span className="text-[13px] text-[var(--dream-soft)]">
                points
              </span>
            </div>
            {!joined ? (
              <div className="mt-4">
                <DreamButton
                  type="button"
                  variant="primary"
                  disabled={readOnly || actions.pending.join}
                  onClick={() => actions.join()}
                >
                  {actions.pending.join ? "Joining…" : "Join rewards"}
                </DreamButton>
                {note ? (
                  <p className="m-0 mt-2 text-[13px] text-[var(--dream-soft)]">
                    {note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </SectionCard>
        </div>

        {/* How to earn */}
        <div className="dream-reveal-item" style={{ "--i": 2 } as CSSProperties}>
          <SectionCard heading="How to earn points">
            {earnLines.length === 0 && !showSocial ? (
              <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                Check back soon for ways to earn points.
              </p>
            ) : (
              <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-[var(--dream-soft)]">
                {earnLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}

            {showSocial ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--dream-line)] pt-4">
                <p className="m-0 text-[13px] font-medium text-[var(--dream-ink)]">
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
                      className="dream-link"
                    >
                      {s.label}
                    </a>
                    {s.claimed ? (
                      <CodeStatusPill status="active" />
                    ) : (
                      <DreamButton
                        type="button"
                        variant="secondary"
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
                      </DreamButton>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>

        {/* Redeem */}
        {program.tiers.length > 0 ? (
          <div className="dream-reveal-item" style={{ "--i": 3 } as CSSProperties}>
            <SectionCard heading="Redeem your points">
              <div className="grid gap-4 sm:grid-cols-2">
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

              {actions.lastRedeemed ? (
                <div
                  className="mt-4 rounded-[var(--dream-radius-input)] p-4"
                  style={{
                    background: "var(--dream-sky)",
                    border: "1px solid var(--dream-line)",
                  }}
                >
                  <p className="m-0 text-[13px] font-medium text-[var(--dream-ink)]">
                    {actions.lastRedeemed.rewardLabel} redeemed
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-[var(--dream-radius-input)] bg-[var(--dream-paper)] px-2 py-1 font-mono text-[13px] text-[var(--dream-ink)]">
                      {actions.lastRedeemed.code}
                    </code>
                    <DreamButton
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        void actions.copyCode(actions.lastRedeemed!.code)
                      }
                    >
                      <Copy
                        aria-hidden="true"
                        strokeWidth={1.5}
                        className="mr-1.5 h-3.5 w-3.5"
                      />
                      Copy
                    </DreamButton>
                  </div>
                  <p className="m-0 mt-2 text-[12px] text-[var(--dream-soft)]">
                    We also emailed it to you. Paste it in the discount field
                    at checkout.
                  </p>
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : null}

        {/* Reward codes */}
        <div className="dream-reveal-item" style={{ "--i": 4 } as CSSProperties}>
          <SectionCard heading="Your reward codes">
            {rewards.codes.length === 0 ? (
              <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                No codes yet.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {rewards.codes.map((code, i) => {
                  const status = rewardCodeStatus(code);
                  return (
                    <li
                      key={code.id}
                      className={
                        "flex flex-wrap items-center justify-between gap-3 py-3" +
                        (i === 0
                          ? " pt-0"
                          : " border-t border-[var(--dream-line)]")
                      }
                    >
                      <div>
                        <code className="rounded-[var(--dream-radius-input)] bg-[var(--dream-sky)] px-2 py-1 font-mono text-[13px] text-[var(--dream-ink)]">
                          {code.code}
                        </code>
                        <p className="m-0 mt-1 text-[12px] text-[var(--dream-soft)]">
                          {code.reason}
                          {code.expiresAt
                            ? ` · Expires ${formatDate(code.expiresAt)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CodeStatusPill status={status} />
                        <DreamButton
                          type="button"
                          variant="link"
                          aria-label={`Copy code ${code.code}`}
                          onClick={() => void actions.copyCode(code.code)}
                        >
                          <Copy
                            aria-hidden="true"
                            strokeWidth={1.5}
                            className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                          />
                          Copy
                        </DreamButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Birthday */}
        {showBirthday ? (
          <div className="dream-reveal-item" style={{ "--i": 5 } as CSSProperties}>
            <SectionCard heading="Birthday bonus">
              <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                Get {rules.birthdayBonus} points on your birthday each year.
              </p>
              {rewards.customer?.birthMonth != null &&
              rewards.customer.birthDay != null ? (
                <p className="m-0 mt-2 text-[13px] font-medium text-[var(--dream-ink)]">
                  Saved:{" "}
                  {formatBirthday(
                    rewards.customer.birthMonth,
                    rewards.customer.birthDay,
                  )}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-[var(--dream-soft)]">
                    Month
                  </span>
                  <DreamSelect
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
                  </DreamSelect>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-[var(--dream-soft)]">
                    Day
                  </span>
                  <DreamSelect
                    value={birthDay}
                    disabled={!joined || readOnly}
                    onChange={(e) => setBirthDay(Number(e.target.value))}
                  >
                    {Array.from({ length: maxDay }, (_, i) => i + 1).map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ),
                    )}
                  </DreamSelect>
                </label>
                <DreamButton
                  type="button"
                  variant="primary"
                  disabled={!joined || readOnly || actions.pending.birthday}
                  onClick={() => actions.updateBirthday(birthMonth, birthDay)}
                >
                  {actions.pending.birthday ? "Saving…" : "Save"}
                </DreamButton>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {/* Recent activity */}
        <div className="dream-reveal-item" style={{ "--i": 6 } as CSSProperties}>
          <SectionCard heading="Recent activity">
            {rewards.entries.length === 0 ? (
              <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                No activity yet.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {rewards.entries.slice(0, 20).map((entry, i) => (
                  <li
                    key={entry.id}
                    className={
                      "flex items-center justify-between gap-3 py-2.5" +
                      (i === 0
                        ? " pt-0"
                        : " border-t border-[var(--dream-line)]")
                    }
                  >
                    <div>
                      <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                        {activityLabel(entry.type)}
                      </p>
                      <p className="m-0 mt-0.5 text-[12px] text-[var(--dream-soft)]">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="m-0 [font-family:var(--font-dream-display)] text-[16px] tabular-nums"
                        style={{
                          color:
                            entry.points >= 0
                              ? "var(--dream-ink)"
                              : "var(--dream-error)",
                        }}
                      >
                        {entry.points >= 0 ? `+${entry.points}` : entry.points}
                      </p>
                      <p className="m-0 mt-0.5 text-[12px] text-[var(--dream-soft)]">
                        Balance: {entry.balanceAfter}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </DreamRevealGroup>
    </DreamAccountLayout>
  );
}
