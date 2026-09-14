"use client";

/**
 * `LaunchCountdown` — a reusable "time until launch" widget for storefront
 * maintenance/"coming soon" pages.
 *
 * Hydration contract: the pages that render this (`MaintenanceScreen` and the
 * vii template's maintenance page) are SERVER components, so this component's
 * FIRST render — both on the server and on the client, before any effect has
 * run — must produce byte-identical markup. It never reads `Date.now()`
 * during render. Instead it holds `now` in `useState<number | null>(null)`
 * and only calls `Date.now()` inside `useEffect`, which never runs during
 * SSR and never runs before React's initial client render is reconciled
 * against the server HTML. Until that effect fires, every numeric cell
 * renders the placeholder "--" (marked `aria-hidden` since it carries no
 * real information yet). `reducedMotion` from `useReducedMotion` starts as
 * `false` on both server and first client render for the same reason — it
 * only flips after its own effect reads `matchMedia`, which is likewise
 * post-hydration.
 *
 * This component is purely presentational: it counts down to `targetIso`
 * and, once passed, shows `pastLabel`. It never disables maintenance mode,
 * redirects, or has any side effect beyond rendering — the owner (or a
 * scheduled job) is responsible for actually taking the store out of
 * maintenance mode when the launch time arrives.
 */
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

import { padTwo, remainingParts } from "~/lib/maintenance-countdown";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

type Props = {
  /** ISO instant of the launch. */
  targetIso: string;
  /** Default "Opening in" — rendered as a visible caption AND used for aria-label. */
  label?: string;
  /** Default "Now open"; null → render nothing once the target has passed. */
  pastLabel?: string | null;
  /** Outer wrapper — template-specific look. */
  className?: string;
  /** Each value+label cell. */
  unitClassName?: string;
  /** Default false. */
  hideSeconds?: boolean;
};

const unitsRowStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: "var(--maintenance-countdown-gap, 1.25rem)",
  fontVariantNumeric: "tabular-nums",
};

const cellStyle: React.CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: "2.5ch",
};

export function LaunchCountdown(props: Props): ReactElement | null {
  const {
    targetIso,
    label = "Opening in",
    pastLabel = "Now open",
    className,
    unitClassName,
    hideSeconds = false,
  } = props;

  const targetMs = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const isValidTarget = Number.isFinite(targetMs);

  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState<number | null>(null);

  const showSeconds = !hideSeconds && !reducedMotion;

  useEffect(() => {
    if (!isValidTarget) {
      return;
    }

    const tickMs = hideSeconds || reducedMotion ? 60000 : 1000;

    setNow(Date.now());

    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= targetMs) {
        clearInterval(id);
      }
    }, tickMs);

    return () => clearInterval(id);
  }, [isValidTarget, targetMs, hideSeconds, reducedMotion]);

  if (!isValidTarget) {
    return null;
  }

  const remaining = now === null ? null : remainingParts(now, targetMs);
  const isPast = now !== null && remaining === null;

  if (isPast) {
    if (pastLabel === null) {
      return null;
    }
    return <p className={className}>{pastLabel}</p>;
  }

  const isPlaceholder = remaining === null;
  const days = remaining ? padTwo(remaining.days) : "--";
  const hours = remaining ? padTwo(remaining.hours) : "--";
  const minutes = remaining ? padTwo(remaining.minutes) : "--";
  const seconds = remaining ? padTwo(remaining.seconds) : "--";

  return (
    <div role="timer" aria-live="off" aria-label={label} className={className}>
      <span data-caption>{label}</span>
      <div data-units style={unitsRowStyle}>
        <span className={unitClassName} data-unit="days" style={cellStyle}>
          <span data-value aria-hidden={isPlaceholder || undefined}>
            {days}
          </span>
          <span data-label>Days</span>
        </span>
        <span className={unitClassName} data-unit="hours" style={cellStyle}>
          <span data-value aria-hidden={isPlaceholder || undefined}>
            {hours}
          </span>
          <span data-label>Hours</span>
        </span>
        <span className={unitClassName} data-unit="minutes" style={cellStyle}>
          <span data-value aria-hidden={isPlaceholder || undefined}>
            {minutes}
          </span>
          <span data-label>Minutes</span>
        </span>
        {showSeconds ? (
          <span className={unitClassName} data-unit="seconds" style={cellStyle}>
            <span data-value aria-hidden={isPlaceholder || undefined}>
              {seconds}
            </span>
            <span data-label>Seconds</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
