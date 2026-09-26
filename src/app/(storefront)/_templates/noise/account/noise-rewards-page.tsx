"use client";

import { useState } from "react";
import { Copy, Gift } from "lucide-react";

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
import { PageTransition } from "~/components/page-animations";

import { NoiseAccountLayout } from "./noise-account-layout";

/** Colour per reward-code status — same palette as `noise-orders-page`'s `statusStyle`. */
function codeStatusStyle(status: RewardCodeStatus): React.CSSProperties {
  switch (status) {
    case "active":
      return { borderColor: "#16a34a", color: "#16a34a" };
    case "expired":
      return { borderColor: "#dc2626", color: "#dc2626" };
    case "used":
    case "inactive":
      return { color: "var(--vn-steel-mist)", borderColor: "var(--vn-rule)" };
    default:
      return {};
  }
}

function StatusPill({ label, status }: { label: string; status: RewardCodeStatus }) {
  return (
    <span
      className="vn-stamp text-[9px] whitespace-nowrap"
      style={codeStatusStyle(status)}
    >
      {label}
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
    <div className="border-foreground/20 border p-6">
      <h2
        className="font-serif leading-none italic"
        style={{ fontSize: "20px", letterSpacing: "-0.01em" }}
      >
        {heading}
      </h2>
      {children}
    </div>
  );
}

function NoiseRedeemTierCard({
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
    <div className="border-foreground/20 flex flex-col gap-1.5 border p-5">
      <p className="font-sans text-[15px] font-medium">{tier.label}</p>
      <p className="font-sans text-[13px]" style={{ color: "var(--vn-steel-mist)" }}>
        {describeTierReward(tier)}
      </p>
      <p
        className="font-serif italic"
        style={{ fontSize: "18px", letterSpacing: "-0.005em" }}
      >
        {tier.pointsCost} points
      </p>
      {minPurchaseNote && (
        <p className="font-sans text-[13px]" style={{ color: "var(--vn-steel-mist)" }}>
          {minPurchaseNote}
        </p>
      )}

      <div className="mt-2">
        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[13px]" style={{ color: "var(--vn-steel-mist)" }}>
              Confirm: spend {tier.pointsCost} points?
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => actions.redeem(tier.id)}
              className="vn-stamp vn-stamp-solid text-[9.5px] disabled:opacity-40"
            >
              {isPending ? "Redeeming…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
              style={{ color: "var(--vn-steel)" }}
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
              className="vn-stamp vn-stamp-solid text-[9.5px] disabled:opacity-40"
            >
              Redeem
            </button>
            {disabledReason && (
              <p
                className="mt-1.5 font-sans text-[13px]"
                style={{ color: "var(--vn-steel-mist)" }}
              >
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
 * NoiseRewardsPage — mirrors `UmscRewardsPage`/`OliveRewardsPage`'s structure
 * (balance hero, how to earn, redeem tiers, reward codes, birthday, recent
 * activity), all built on the shared `rewards-content.tsx` helpers and
 * `useRewardsActions`; skin only.
 */
export function NoiseRewardsPage({ rewards }: RewardsPageTemplateProps) {
  const actions = useRewardsActions();
  const [confirmingTierId, setConfirmingTierId] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState(
    rewards.customer?.birthMonth ?? 1,
  );
  const [birthDay, setBirthDay] = useState(rewards.customer?.birthDay ?? 1);

  return (
    <PageTransition>
      <NoiseAccountLayout heading="Rewards">
        {!rewards.program ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div
              className="border-foreground/20 flex items-center justify-center border-2"
              style={{ width: "64px", height: "64px" }}
            >
              <Gift className="size-6" style={{ color: "var(--vn-steel-mist)" }} />
            </div>
            <div>
              <p
                className="font-serif leading-none italic"
                style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
              >
                No rewards program yet.
              </p>
              <p
                className="mt-2 font-sans text-sm"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                This store hasn&apos;t set up rewards. Check back soon.
              </p>
            </div>
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
                    className="border-foreground/20 border p-4"
                    style={{ background: "var(--vn-bone)" }}
                  >
                    <p className="font-sans text-[13px]" style={{ color: "var(--vn-steel-mist)" }}>
                      Rewards are paused right now. Your balance is safe and
                      you&apos;ll be able to earn and redeem again when the
                      program is back.
                    </p>
                  </div>
                )}

                {/* Balance hero */}
                <SectionCard heading="Your balance">
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className="font-serif italic"
                      style={{ fontSize: "48px", letterSpacing: "-0.01em" }}
                    >
                      {balance}
                    </span>
                    <span
                      className="font-mono text-[10px] tracking-[0.1em] uppercase"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      points
                    </span>
                  </div>
                  {!joined && (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={readOnly || actions.pending.join}
                        onClick={() => actions.join()}
                        className="vn-stamp vn-stamp-solid text-[9.5px] disabled:opacity-40"
                      >
                        {actions.pending.join ? "Joining…" : "Join rewards"}
                      </button>
                      {note && (
                        <p
                          className="mt-2 font-sans text-[13px]"
                          style={{ color: "var(--vn-steel-mist)" }}
                        >
                          {note}
                        </p>
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* How to earn */}
                <SectionCard heading="How to earn points">
                  {earnLines.length === 0 && !showSocial ? (
                    <p
                      className="mt-2 font-sans text-[13px]"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      Check back soon for ways to earn points.
                    </p>
                  ) : (
                    <ul
                      className="mt-3 flex list-disc flex-col gap-1.5 pl-5 font-sans text-[13px]"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {earnLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}

                  {showSocial && (
                    <div className="border-foreground/15 mt-4 flex flex-col gap-3 border-t pt-4">
                      <p className="font-sans text-[13px] font-medium">
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
                            className="font-sans text-[13px] underline"
                            style={{ color: "var(--vn-steel-mist)" }}
                          >
                            {s.label}
                          </a>
                          {s.claimed ? (
                            <span
                              className="vn-stamp text-[9px]"
                              style={{ borderColor: "#16a34a", color: "#16a34a" }}
                            >
                              Claimed
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={
                                !joined ||
                                readOnly ||
                                actions.pending.claimSocial === s.network
                              }
                              onClick={() => actions.claimSocial(s.network)}
                              className="vn-stamp text-[9px] disabled:opacity-40"
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
                </SectionCard>

                {/* Redeem */}
                {program.tiers.length > 0 && (
                  <SectionCard heading="Redeem your points">
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {program.tiers.map((tier) => (
                        <NoiseRedeemTierCard
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
                      <div className="border-foreground/20 mt-4 border p-4" style={{ background: "var(--vn-bone)" }}>
                        <p className="font-sans text-[13px] font-medium">
                          {actions.lastRedeemed.rewardLabel} redeemed
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code
                            className="border-foreground/20 border px-2 py-1 font-mono text-[13px]"
                            style={{ background: "var(--vn-paper)" }}
                          >
                            {actions.lastRedeemed.code}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              void actions.copyCode(actions.lastRedeemed!.code)
                            }
                            className="vn-stamp inline-flex items-center gap-1.5 text-[9px]"
                          >
                            <Copy className="size-3" aria-hidden="true" />
                            Copy
                          </button>
                        </div>
                        <p
                          className="mt-2 font-sans text-[13px]"
                          style={{ color: "var(--vn-steel-mist)" }}
                        >
                          We also emailed it to you. Paste it in the discount
                          field at checkout.
                        </p>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Reward codes */}
                <SectionCard heading="Your reward codes">
                  {rewards.codes.length === 0 ? (
                    <p
                      className="mt-2 font-sans text-[13px]"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
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
                                : { borderTop: "1px solid var(--vn-rule)" }
                            }
                          >
                            <div>
                              <code
                                className="border-foreground/20 border px-2 py-1 font-mono text-[13px]"
                                style={{ background: "var(--vn-bone)" }}
                              >
                                {code.code}
                              </code>
                              <p
                                className="mt-1.5 font-sans text-[13px]"
                                style={{ color: "var(--vn-steel-mist)" }}
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
                                status={status}
                              />
                              <button
                                type="button"
                                aria-label={`Copy code ${code.code}`}
                                onClick={() => void actions.copyCode(code.code)}
                                className="inline-flex items-center gap-1.5 px-1 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
                                style={{ color: "var(--vn-steel)" }}
                              >
                                <Copy className="size-3" aria-hidden="true" />
                                Copy
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </SectionCard>

                {/* Birthday */}
                {showBirthday && (
                  <SectionCard heading="Birthday bonus">
                    <p
                      className="mt-1.5 font-sans text-[13px]"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      Get {rules.birthdayBonus} points on your birthday each
                      year.
                    </p>
                    {rewards.customer?.birthMonth != null &&
                      rewards.customer.birthDay != null && (
                        <p className="mt-2 font-sans text-[13px] font-medium">
                          Saved:{" "}
                          {formatBirthday(
                            rewards.customer.birthMonth,
                            rewards.customer.birthDay,
                          )}
                        </p>
                      )}
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1.5">
                        <span
                          className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
                          style={{ color: "var(--vn-steel-mist)" }}
                        >
                          Month
                        </span>
                        <select
                          className="border-foreground/20 h-10 border px-3 font-sans text-[14px]"
                          style={{ background: "var(--vn-paper)" }}
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
                        <span
                          className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
                          style={{ color: "var(--vn-steel-mist)" }}
                        >
                          Day
                        </span>
                        <select
                          className="border-foreground/20 h-10 border px-3 font-sans text-[14px]"
                          style={{ background: "var(--vn-paper)" }}
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
                        className="vn-stamp vn-stamp-solid text-[9.5px] disabled:opacity-40"
                      >
                        {actions.pending.birthday ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </SectionCard>
                )}

                {/* Recent activity */}
                <SectionCard heading="Recent activity">
                  {rewards.entries.length === 0 ? (
                    <p
                      className="mt-2 font-sans text-[13px]"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
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
                              : { borderTop: "1px solid var(--vn-rule)" }
                          }
                        >
                          <div>
                            <p className="font-sans text-[13px]" style={{ color: "var(--vn-steel-mist)" }}>
                              {activityLabel(entry.type)}
                            </p>
                            <p
                              className="mt-0.5 font-mono text-[10px] tracking-[0.06em]"
                              style={{ color: "var(--vn-steel-mist)" }}
                            >
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="font-serif italic"
                              style={{
                                fontSize: "16px",
                                letterSpacing: "-0.005em",
                                color:
                                  entry.points >= 0
                                    ? "var(--vn-ink)"
                                    : "#dc2626",
                              }}
                            >
                              {entry.points >= 0
                                ? `+${entry.points}`
                                : entry.points}
                            </p>
                            <p
                              className="mt-0.5 font-mono text-[10px] tracking-[0.06em]"
                              style={{ color: "var(--vn-steel-mist)" }}
                            >
                              Balance: {entry.balanceAfter}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              </div>
            );
          })()
        )}
      </NoiseAccountLayout>
    </PageTransition>
  );
}
