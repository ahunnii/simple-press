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

import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscAccountLayout } from "./umsc-account-layout";

const CODE_STATUS_COLOR: Record<RewardCodeStatus, string> = {
  active: "var(--umsc-success)",
  used: "var(--umsc-muted)",
  expired: "var(--umsc-error)",
  inactive: "var(--umsc-muted)",
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-2 py-1">
      <span
        aria-hidden="true"
        className="size-2 rounded-full"
        style={{ background: color }}
      />
      <span className="umsc-sans text-[11px] font-medium text-[var(--umsc-ink)]">
        {label}
      </span>
    </span>
  );
}

function UmscRedeemTierCard({
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
    <div className="flex flex-col gap-1.5 border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-5">
      <p className="umsc-sans text-[15px] font-medium text-[var(--umsc-ink)]">
        {tier.label}
      </p>
      <p className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
        {describeTierReward(tier)}
      </p>
      <p className="umsc-tabular umsc-serif text-[18px] font-normal text-[var(--umsc-gold-ink)]">
        {tier.pointsCost} points
      </p>
      {minPurchaseNote && (
        <p className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
          {minPurchaseNote}
        </p>
      )}

      <div className="mt-2">
        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
              Confirm: spend {tier.pointsCost} points?
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => actions.redeem(tier.id)}
              className="umsc-btn umsc-btn-gold px-4 py-1.5 text-[11px]"
            >
              {isPending ? "Redeeming…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="umsc-sans text-[13px] text-[var(--umsc-muted)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={!!disabledReason || isPending}
              onClick={() => onRequestConfirm(tier.id)}
              className="umsc-btn umsc-btn-gold px-4 py-1.5 text-[11px] disabled:opacity-40"
            >
              Redeem
            </button>
            {disabledReason && (
              <p className="umsc-sans mt-1.5 text-[13px] text-[var(--umsc-muted)]">
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
 * UmscRewardsPage — mirrors `OliveRewardsPage`'s structure (balance hero, how
 * to earn, redeem tiers, reward codes, birthday, recent activity), all built
 * on the shared `rewards-content.tsx` helpers/`useRewardsActions`; skin only.
 */
export function UmscRewardsPage({ rewards }: RewardsPageTemplateProps) {
  const actions = useRewardsActions();
  const [confirmingTierId, setConfirmingTierId] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState(
    rewards.customer?.birthMonth ?? 1,
  );
  const [birthDay, setBirthDay] = useState(rewards.customer?.birthDay ?? 1);

  return (
    <UmscAccountLayout
      heading="Rewards"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Rewards" },
      ]}
    >
      {!rewards.program ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-6 size-16">
            <UmscImageFallback aspect="1 / 1" />
          </div>
          <h2 className="umsc-serif text-[22px] font-normal text-[var(--umsc-ink)]">
            No rewards program yet
          </h2>
          <p className="umsc-sans mt-3 max-w-[36ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
            This store hasn&apos;t set up rewards. Check back soon.
          </p>
        </div>
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
          const showBirthday = rules.birthdayEnabled && rules.birthdayBonus > 0;
          const maxDay = daysInMonth(birthMonth);
          const note = signupBonusNote(rules);

          return (
            <div className="flex flex-col gap-6">
              {readOnly && (
                <div
                  role="status"
                  className="border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-4"
                >
                  <p className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
                    Rewards are paused right now. Your balance is safe and
                    you&apos;ll be able to earn and redeem again when the
                    program is back.
                  </p>
                </div>
              )}

              {/* Balance hero */}
              <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
                <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
                  Your balance
                </h2>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="umsc-tabular umsc-serif text-[48px] font-normal text-[var(--umsc-ink)]">
                    {balance}
                  </span>
                  <span className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
                    points
                  </span>
                </div>
                {!joined && (
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={readOnly || actions.pending.join}
                      onClick={() => actions.join()}
                      className="umsc-btn umsc-btn-gold px-5 py-2 text-[11px]"
                    >
                      {actions.pending.join ? "Joining…" : "Join rewards"}
                    </button>
                    {note && (
                      <p className="umsc-sans mt-2 text-[13px] text-[var(--umsc-muted)]">
                        {note}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* How to earn */}
              <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
                <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
                  How to earn points
                </h2>
                {earnLines.length === 0 && !showSocial ? (
                  <p className="umsc-sans mt-2 text-[13px] text-[var(--umsc-muted)]">
                    Check back soon for ways to earn points.
                  </p>
                ) : (
                  <ul className="umsc-sans mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-[var(--umsc-muted)]">
                    {earnLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}

                {showSocial && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--umsc-line)] pt-4">
                    <p className="umsc-sans text-[13px] font-medium text-[var(--umsc-ink)]">
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
                          className="umsc-sans text-[13px] text-[var(--umsc-muted)] underline"
                        >
                          {s.label}
                        </a>
                        {s.claimed ? (
                          <StatusPill
                            label="Claimed"
                            color="var(--umsc-success)"
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={
                              !joined ||
                              readOnly ||
                              actions.pending.claimSocial === s.network
                            }
                            onClick={() => actions.claimSocial(s.network)}
                            className="umsc-sans border border-[var(--umsc-line)] px-3 py-1.5 text-[11px] font-semibold text-[var(--umsc-muted)] uppercase disabled:opacity-40"
                          >
                            {actions.pending.claimSocial === s.network
                              ? "Claiming…"
                              : `Claim ${rules.socialFollowBonus} points`}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Redeem */}
              {program.tiers.length > 0 && (
                <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
                  <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
                    Redeem your points
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {program.tiers.map((tier) => (
                      <UmscRedeemTierCard
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
                    <div className="mt-4 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-4">
                      <p className="umsc-sans text-[13px] font-medium text-[var(--umsc-ink)]">
                        {actions.lastRedeemed.rewardLabel} redeemed
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] px-2 py-1 font-mono text-[13px]">
                          {actions.lastRedeemed.code}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            void actions.copyCode(actions.lastRedeemed!.code)
                          }
                          className="umsc-sans inline-flex items-center gap-1.5 border border-[var(--umsc-line)] px-3 py-1.5 text-[11px] font-semibold text-[var(--umsc-muted)] uppercase"
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          Copy
                        </button>
                      </div>
                      <p className="umsc-sans mt-2 text-[13px] text-[var(--umsc-muted)]">
                        We also emailed it to you. Paste it in the discount
                        field at checkout.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reward codes */}
              <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
                <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
                  Your reward codes
                </h2>
                {rewards.codes.length === 0 ? (
                  <p className="umsc-sans mt-2 text-[13px] text-[var(--umsc-muted)]">
                    No codes yet.
                  </p>
                ) : (
                  <ul className="m-0 mt-3 flex list-none flex-col p-0">
                    {rewards.codes.map((code, i) => {
                      const status = rewardCodeStatus(code);
                      return (
                        <li
                          key={code.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                          style={
                            i === 0
                              ? undefined
                              : { borderTop: "1px solid var(--umsc-line)" }
                          }
                        >
                          <div>
                            <code className="border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-2 py-1 font-mono text-[13px]">
                              {code.code}
                            </code>
                            <p className="umsc-sans mt-1.5 text-[13px] text-[var(--umsc-muted)]">
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
                            <button
                              type="button"
                              aria-label={`Copy code ${code.code}`}
                              onClick={() => void actions.copyCode(code.code)}
                              className="umsc-sans inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-[var(--umsc-muted)] uppercase"
                            >
                              <Copy className="size-3.5" aria-hidden="true" />
                              Copy
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Birthday */}
              {showBirthday && (
                <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
                  <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
                    Birthday bonus
                  </h2>
                  <p className="umsc-sans mt-1.5 text-[13px] text-[var(--umsc-muted)]">
                    Get {rules.birthdayBonus} points on your birthday each year.
                  </p>
                  {rewards.customer?.birthMonth != null &&
                    rewards.customer.birthDay != null && (
                      <p className="umsc-sans mt-2 text-[13px] font-medium text-[var(--umsc-ink)]">
                        Saved:{" "}
                        {formatBirthday(
                          rewards.customer.birthMonth,
                          rewards.customer.birthDay,
                        )}
                      </p>
                    )}
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="umsc-sans text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase">
                        Month
                      </span>
                      <select
                        className="umsc-sans h-10 border border-[var(--umsc-line)] bg-[var(--umsc-white)] px-3 text-[14px] text-[var(--umsc-ink)]"
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
                      <span className="umsc-sans text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase">
                        Day
                      </span>
                      <select
                        className="umsc-sans h-10 border border-[var(--umsc-line)] bg-[var(--umsc-white)] px-3 text-[14px] text-[var(--umsc-ink)]"
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
                    <button
                      type="button"
                      disabled={!joined || readOnly || actions.pending.birthday}
                      onClick={() =>
                        actions.updateBirthday(birthMonth, birthDay)
                      }
                      className="umsc-btn umsc-btn-gold px-5 py-2 text-[11px] disabled:opacity-40"
                    >
                      {actions.pending.birthday ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}

              {/* Recent activity */}
              <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
                <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
                  Recent activity
                </h2>
                {rewards.entries.length === 0 ? (
                  <p className="umsc-sans mt-2 text-[13px] text-[var(--umsc-muted)]">
                    No activity yet.
                  </p>
                ) : (
                  <ul className="m-0 mt-3 flex list-none flex-col p-0">
                    {rewards.entries.slice(0, 20).map((entry, i) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                        style={
                          i === 0
                            ? undefined
                            : { borderTop: "1px solid var(--umsc-line)" }
                        }
                      >
                        <div>
                          <p className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
                            {activityLabel(entry.type)}
                          </p>
                          <p className="umsc-sans mt-0.5 text-[11px] text-[var(--umsc-muted)]">
                            {formatDate(entry.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className="umsc-tabular umsc-serif text-[16px] font-normal"
                            style={{
                              color:
                                entry.points >= 0
                                  ? "var(--umsc-ink)"
                                  : "var(--umsc-error)",
                            }}
                          >
                            {entry.points >= 0
                              ? `+${entry.points}`
                              : entry.points}
                          </p>
                          <p className="umsc-sans mt-0.5 text-[11px] text-[var(--umsc-muted)]">
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
    </UmscAccountLayout>
  );
}
