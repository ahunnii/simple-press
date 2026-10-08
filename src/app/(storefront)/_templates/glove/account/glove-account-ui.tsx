import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

import { GloveButton } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveMistPanel } from "../shared/glove-mist-panel";

/** White hairline card: the account pages' one container. */
export function GloveAccountCard({
  children,
  className,
  style,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "article" | "section";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--glove-radius-card)] border border-[var(--glove-line)] bg-[var(--glove-paper)] p-5 md:p-6",
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}

/** Heading inside an account card. */
export function GloveCardHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "glove-display text-[18px] leading-tight font-medium text-[var(--glove-ink)]",
        className,
      )}
    >
      {children}
    </h3>
  );
}

/** Designed empty state: glove glyph, heading, line of copy, button. */
export function GloveAccountEmpty({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <GloveMistPanel className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <GloveHandIcon className="size-16 text-[var(--glove-primary)]" />
      <h3 className="glove-display text-[22px] leading-tight font-medium text-[var(--glove-ink)]">
        {heading}
      </h3>
      <p className="max-w-md text-[15px] text-[var(--glove-text)]">{body}</p>
      {cta ? (
        <GloveButton href={cta.href} variant="woo" className="mt-2">
          {cta.label}
        </GloveButton>
      ) : null}
    </GloveMistPanel>
  );
}

export type GloveStatusTone = "primary" | "success" | "muted" | "alert";

const TONE: Record<GloveStatusTone, string> = {
  primary:
    "border-[var(--glove-mist-line)] bg-[var(--glove-mist)] text-[var(--glove-primary)]",
  success:
    "border-[var(--glove-success)] bg-[var(--glove-paper)] text-[var(--glove-success)]",
  muted:
    "border-[var(--glove-line)] bg-[var(--glove-cloud)] text-[var(--glove-muted)]",
  alert:
    "border-[var(--glove-alert)] bg-[var(--glove-paper)] text-[var(--glove-alert)]",
};

/** Small uppercase status pill; the label always carries the meaning. */
export function GloveStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: GloveStatusTone;
}) {
  return (
    <span
      className={cn(
        "glove-display inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] leading-5 font-semibold tracking-[0.06em] uppercase",
        TONE[tone],
      )}
    >
      {label}
    </span>
  );
}

const OPEN_STATUS = { label: "Open", tone: "primary" } as const;

const ORDER_STATUS: Record<string, { label: string; tone: GloveStatusTone }> = {
  open: OPEN_STATUS,
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
  refunded: { label: "Refunded", tone: "alert" },
};

/** Order status pill; an unknown status reads as open. */
export function GloveOrderStatus({ status }: { status: string }) {
  const entry = ORDER_STATUS[status] ?? OPEN_STATUS;
  return <GloveStatusBadge label={entry.label} tone={entry.tone} />;
}
