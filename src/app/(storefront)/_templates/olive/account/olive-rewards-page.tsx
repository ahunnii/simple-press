"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import type { RewardsPageTemplateProps } from "../../types";
import type {
  RewardCodeStatus,
  RewardsActions,
  RewardsData,
  RewardsTier,
} from "~/app/(storefront)/_components/account/rewards-content";
import { formatDate } from "~/lib/format-date";
import { describeTierReward } from "~/lib/loyalty/settings";
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

import {
  OliveButton,
  OliveChip,
  OliveEmptyState,
  OliveReveal,
} from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/** Colour per reward-code status — the leaf-bright field is reserved for "Active". */
const CODE_STATUS_COLOR: Record<RewardCodeStatus, string> = {
  active: "var(--olive-sage-bright)",
  used: "var(--olive-slate)",
  expired: "var(--olive-error)",
  inactive: "var(--olive-ink-soft)",
};

/** A word-plus-chip status pill, matching `OliveStatusBadge`'s markup for a status set it doesn't cover. */
function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2"
      style={{
        backgroundColor: "var(--olive-paper)",
        border: "1px solid var(--olive-hairline)",
        borderRadius: "999px",
        padding: "0.1875rem 0.5rem",
      }}
    >
      <OliveChip color={color} label={label} size={12} srOnlyLabel={false} />
      <span
        className="olive-label"
        style={{ color: "var(--olive-ink)", fontSize: "0.6875rem" }}
      >
        {label}
      </span>
    </span>
  );
}

function OliveRedeemTierCard({
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
    <div
      className="olive-card p-5"
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      <p className="olive-h3" style={{ margin: 0 }}>
        {tier.label}
      </p>
      <p className="olive-caption" style={{ margin: 0 }}>
        {describeTierReward(tier)}
      </p>
      <p className="olive-price">{tier.pointsCost} points</p>
      {minPurchaseNote && (
        <p className="olive-caption" style={{ margin: 0 }}>
          {minPurchaseNote}
        </p>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="olive-caption">
              Confirm: spend {tier.pointsCost} points?
            </span>
            <OliveButton
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={() => actions.redeem(tier.id)}
            >
              {isPending ? "Redeeming…" : "Confirm"}
            </OliveButton>
            <OliveButton variant="ghost" size="sm" onClick={onCancelConfirm}>
              Cancel
            </OliveButton>
          </div>
        ) : (
          <>
            <OliveButton
              variant="primary"
              size="sm"
              disabled={!!disabledReason || isPending}
              onClick={() => onRequestConfirm(tier.id)}
            >
              Redeem
            </OliveButton>
            {disabledReason && (
              <p className="olive-caption" style={{ marginTop: "0.375rem" }}>
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
 * OliveRewardsPage — an olive-skinned rewards page. All the derived state
 * (who's disabled and why, a reward code's status, birthday formatting) comes
 * from the pure helpers exported by the shared `rewards-content.tsx`; this
 * file only supplies olive markup and `useRewardsActions()` for the mutations.
 */
export function OliveRewardsPage({ rewards }: RewardsPageTemplateProps) {
  const actions = useRewardsActions();
  const [confirmingTierId, setConfirmingTierId] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState(
    rewards.customer?.birthMonth ?? 1,
  );
  const [birthDay, setBirthDay] = useState(rewards.customer?.birthDay ?? 1);

  return (
    <OliveAccountLayout
      heading="Rewards"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Rewards" },
      ]}
    >
      <OliveReveal>
        {!rewards.program ? (
          <OliveEmptyState
            heading="No rewards program yet"
            body="This store hasn't set up rewards. Check back soon."
          />
        ) : (
          (() => {
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
            const showBirthday =
              rules.birthdayEnabled && rules.birthdayBonus > 0;
            const maxDay = daysInMonth(birthMonth);
            const note = signupBonusNote(rules);

            return (
              <div className="flex flex-col gap-6">
                {readOnly && (
                  <div
                    role="status"
                    className="olive-card olive-card-paper p-4"
                  >
                    <p className="olive-caption" style={{ margin: 0 }}>
                      Rewards are paused right now. Your balance is safe and
                      you&apos;ll be able to earn and redeem again when the
                      program is back.
                    </p>
                  </div>
                )}

                {/* Balance hero */}
                <div className="olive-card p-6">
                  <h2 className="olive-h3" style={{ margin: 0 }}>
                    Your balance
                  </h2>
                  <div
                    className="flex items-baseline gap-2"
                    style={{ marginTop: "0.75rem" }}
                  >
                    <span
                      className="olive-display"
                      style={{ fontSize: "3rem" }}
                    >
                      {balance}
                    </span>
                    <span className="olive-caption">points</span>
                  </div>
                  {!joined && (
                    <div style={{ marginTop: "1rem" }}>
                      <OliveButton
                        variant="primary"
                        size="sm"
                        disabled={readOnly || actions.pending.join}
                        onClick={() => actions.join()}
                      >
                        {actions.pending.join ? "Joining…" : "Join rewards"}
                      </OliveButton>
                      {note && (
                        <p
                          className="olive-caption"
                          style={{ marginTop: "0.5rem" }}
                        >
                          {note}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* How to earn */}
                <div className="olive-card p-6">
                  <h2 className="olive-h3" style={{ margin: 0 }}>
                    How to earn points
                  </h2>
                  {earnLines.length === 0 && !showSocial ? (
                    <p
                      className="olive-caption"
                      style={{ marginTop: "0.5rem" }}
                    >
                      Check back soon for ways to earn points.
                    </p>
                  ) : (
                    <ul
                      className="olive-caption"
                      style={{
                        marginTop: "0.75rem",
                        paddingLeft: "1.25rem",
                        listStyle: "disc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.375rem",
                      }}
                    >
                      {earnLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}

                  {showSocial && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid var(--olive-hairline)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <p className="olive-label" style={{ margin: 0 }}>
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
                            className="olive-caption"
                            style={{ textDecoration: "underline" }}
                          >
                            {s.label}
                          </a>
                          {s.claimed ? (
                            <StatusPill
                              label="Claimed"
                              color="var(--olive-leaf)"
                            />
                          ) : (
                            <OliveButton
                              variant="secondary"
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
                            </OliveButton>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Redeem */}
                {program.tiers.length > 0 && (
                  <div className="olive-card p-6">
                    <h2 className="olive-h3" style={{ margin: 0 }}>
                      Redeem your points
                    </h2>
                    <div
                      className="grid gap-4 sm:grid-cols-2"
                      style={{ marginTop: "1rem" }}
                    >
                      {program.tiers.map((tier) => (
                        <OliveRedeemTierCard
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
                      <div
                        className="olive-card olive-card-paper p-4"
                        style={{ marginTop: "1rem" }}
                      >
                        <p className="olive-label" style={{ margin: 0 }}>
                          {actions.lastRedeemed.rewardLabel} redeemed
                        </p>
                        <div
                          className="flex flex-wrap items-center gap-2"
                          style={{ marginTop: "0.5rem" }}
                        >
                          <code
                            style={{
                              fontFamily: "monospace",
                              backgroundColor: "var(--olive-white)",
                              border: "1px solid var(--olive-hairline)",
                              borderRadius: "0.25rem",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            {actions.lastRedeemed.code}
                          </code>
                          <OliveButton
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              void actions.copyCode(actions.lastRedeemed!.code)
                            }
                          >
                            <Copy
                              style={{ width: 14, height: 14 }}
                              aria-hidden
                            />
                            Copy
                          </OliveButton>
                        </div>
                        <p
                          className="olive-caption"
                          style={{ marginTop: "0.5rem" }}
                        >
                          We also emailed it to you. Paste it in the discount
                          field at checkout.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Reward codes */}
                <div className="olive-card p-6">
                  <h2 className="olive-h3" style={{ margin: 0 }}>
                    Your reward codes
                  </h2>
                  {rewards.codes.length === 0 ? (
                    <p
                      className="olive-caption"
                      style={{ marginTop: "0.5rem" }}
                    >
                      No codes yet.
                    </p>
                  ) : (
                    <ul
                      style={{
                        marginTop: "0.75rem",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {rewards.codes.map((code, i) => {
                        const status = rewardCodeStatus(code);
                        return (
                          <li
                            key={code.id}
                            className="flex flex-wrap items-center justify-between gap-3"
                            style={{
                              paddingBlock: "0.75rem",
                              paddingTop: i === 0 ? 0 : "0.75rem",
                              borderTop:
                                i === 0
                                  ? undefined
                                  : "1px solid var(--olive-hairline)",
                            }}
                          >
                            <div>
                              <code
                                style={{
                                  fontFamily: "monospace",
                                  backgroundColor: "var(--olive-paper)",
                                  borderRadius: "0.25rem",
                                  padding: "0.25rem 0.5rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {code.code}
                              </code>
                              <p
                                className="olive-caption"
                                style={{ marginTop: "0.375rem" }}
                              >
                                {code.reason}
                                {code.expiresAt
                                  ? ` · Expires ${formatDate(code.expiresAt)}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusPill
                                label={REWARD_CODE_STATUS_LABEL[status]}
                                color={CODE_STATUS_COLOR[status]}
                              />
                              <OliveButton
                                variant="ghost"
                                size="sm"
                                aria-label={`Copy code ${code.code}`}
                                onClick={() => void actions.copyCode(code.code)}
                              >
                                <Copy
                                  style={{ width: 14, height: 14 }}
                                  aria-hidden
                                />
                                Copy
                              </OliveButton>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Birthday */}
                {showBirthday && (
                  <div className="olive-card p-6">
                    <h2 className="olive-h3" style={{ margin: 0 }}>
                      Birthday bonus
                    </h2>
                    <p
                      className="olive-caption"
                      style={{ marginTop: "0.375rem" }}
                    >
                      Get {rules.birthdayBonus} points on your birthday each
                      year.
                    </p>
                    {rewards.customer?.birthMonth != null &&
                      rewards.customer.birthDay != null && (
                        <p
                          className="olive-label"
                          style={{ marginTop: "0.5rem" }}
                        >
                          Saved:{" "}
                          {formatBirthday(
                            rewards.customer.birthMonth,
                            rewards.customer.birthDay,
                          )}
                        </p>
                      )}
                    <div
                      className="flex flex-wrap items-end gap-3"
                      style={{ marginTop: "1rem" }}
                    >
                      <label className="flex flex-col gap-1.5">
                        <span className="olive-label">Month</span>
                        <select
                          className="olive-select"
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
                      <label className="flex flex-col gap-1.5">
                        <span className="olive-label">Day</span>
                        <select
                          className="olive-select"
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
                        </select>
                      </label>
                      <OliveButton
                        variant="primary"
                        size="sm"
                        disabled={
                          !joined || readOnly || actions.pending.birthday
                        }
                        onClick={() =>
                          actions.updateBirthday(birthMonth, birthDay)
                        }
                      >
                        {actions.pending.birthday ? "Saving…" : "Save"}
                      </OliveButton>
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                <div className="olive-card p-6">
                  <h2 className="olive-h3" style={{ margin: 0 }}>
                    Recent activity
                  </h2>
                  {rewards.entries.length === 0 ? (
                    <p
                      className="olive-caption"
                      style={{ marginTop: "0.5rem" }}
                    >
                      No activity yet.
                    </p>
                  ) : (
                    <ul
                      style={{
                        marginTop: "0.75rem",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {rewards.entries.slice(0, 20).map((entry, i) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3"
                          style={{
                            paddingBlock: "0.625rem",
                            paddingTop: i === 0 ? 0 : "0.625rem",
                            borderTop:
                              i === 0
                                ? undefined
                                : "1px solid var(--olive-hairline)",
                          }}
                        >
                          <div>
                            <p className="olive-caption" style={{ margin: 0 }}>
                              {activityLabel(entry.type)}
                            </p>
                            <p
                              className="olive-label"
                              style={{ margin: 0, marginTop: "0.125rem" }}
                            >
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p
                              className="olive-price"
                              style={{
                                margin: 0,
                                color:
                                  entry.points >= 0
                                    ? "var(--olive-ink)"
                                    : "var(--olive-error)",
                              }}
                            >
                              {entry.points >= 0
                                ? `+${entry.points}`
                                : entry.points}
                            </p>
                            <p
                              className="olive-label"
                              style={{ margin: 0, marginTop: "0.125rem" }}
                            >
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
          })()
        )}
      </OliveReveal>
    </OliveAccountLayout>
  );
}
