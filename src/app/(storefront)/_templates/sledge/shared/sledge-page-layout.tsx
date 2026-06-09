import type { ReactNode } from "react";
import Link from "next/link";

import { FadeIn } from "~/components/page-animations";
import { cn } from "~/lib/utils";

/** Shared prose styles for CMS / blog body content */
export const SLEDGE_PROSE =
  "prose max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-[0.04em] prose-headings:text-[var(--sl-coral-aa)] prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-[var(--sl-ink-soft)] prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-[var(--sl-ink)] prose-a:text-[var(--sl-coral-aa)] prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-[var(--sl-ink-soft)] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l-4 prose-blockquote:border-[var(--sl-coral)] prose-blockquote:pl-6 prose-blockquote:font-sans prose-blockquote:italic prose-blockquote:text-[var(--sl-ink-soft)] prose-hr:border-[#e8e8e8] prose-hr:my-10";

export const SLEDGE_PAGE_CONTAINER = "mx-auto w-full max-w-7xl px-7";
export const SLEDGE_PAGE_HEADER_PADDING =
  "pt-16 pb-10 md:pt-20 md:pb-12";
export const SLEDGE_PAGE_CONTENT_PADDING = "pb-16 md:pb-20";

type SledgePageHeaderProps = {
  title: string;
  /** Small label above the title (e.g. "Legal") */
  eyebrow?: string;
  intro?: string;
  meta?: ReactNode;
  backLink?: { href: string; label: string };
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  sectionAttrs?: Record<string, string>;
};

export function SledgePageHeader({
  title,
  eyebrow,
  intro,
  meta,
  backLink,
  actions,
  children,
  className,
  sectionAttrs,
}: SledgePageHeaderProps) {
  const hasActions = Boolean(actions);

  return (
    <section
      className={cn(
        SLEDGE_PAGE_CONTAINER,
        SLEDGE_PAGE_HEADER_PADDING,
        className,
      )}
      {...sectionAttrs}
    >
      <FadeIn
        className={cn(
          "text-left",
          hasActions &&
            "flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between",
        )}
      >
        <div className={cn(hasActions && "min-w-0 flex-1")}>
          {backLink ? (
            <Link
              href={backLink.href}
              className="sl-eyebrow mb-5 inline-block font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
            >
              ← {backLink.label}
            </Link>
          ) : null}
          {eyebrow ? (
            <p className="sl-eyebrow mb-4 font-sans text-xs tracking-[0.18em] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="sl-page-title-lg font-heading font-semibold uppercase">
            {title}
          </h1>
          {intro ? (
            <p className="sl-eyebrow mt-5 max-w-2xl font-sans text-sm leading-relaxed md:text-base">
              {intro}
            </p>
          ) : null}
          {meta}
        </div>
        {actions ? (
          <div className="shrink-0 self-start sm:self-auto">{actions}</div>
        ) : null}
      </FadeIn>
      {children}
    </section>
  );
}

type SledgePageSectionProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Skip default bottom padding (e.g. mid-page sections) */
  noBottomPadding?: boolean;
  sectionAttrs?: Record<string, string>;
  animate?: boolean;
};

export function SledgePageSection({
  children,
  className,
  innerClassName,
  noBottomPadding = false,
  sectionAttrs,
  animate = false,
}: SledgePageSectionProps) {
  const inner = (
    <div className={cn(SLEDGE_PAGE_CONTAINER, innerClassName)}>{children}</div>
  );

  return (
    <section
      className={cn(
        !noBottomPadding && SLEDGE_PAGE_CONTENT_PADDING,
        className,
      )}
      {...sectionAttrs}
    >
      {animate ? <FadeIn>{inner}</FadeIn> : inner}
    </section>
  );
}

type SledgePageSubheadingProps = {
  title: string;
  aside?: ReactNode;
  className?: string;
};

/** Secondary section label (e.g. "All Posts", "More Collections") */
export function SledgePageSubheading({
  title,
  aside,
  className,
}: SledgePageSubheadingProps) {
  return (
    <div
      className={cn(
        SLEDGE_PAGE_CONTAINER,
        "flex items-baseline justify-between gap-4 py-8",
        className,
      )}
    >
      <h2 className="sl-rail-heading font-heading font-bold uppercase">
        {title}
      </h2>
      {aside}
    </div>
  );
}

type SledgeEmptyStateProps = {
  message: string;
  action?: ReactNode;
  className?: string;
  /** When true, skip outer container (use inside SledgePageSection) */
  bare?: boolean;
};

export function SledgeEmptyState({
  message,
  action,
  className,
  bare = false,
}: SledgeEmptyStateProps) {
  const content = (
    <FadeIn className={cn("text-center", className)}>
      <p className="sl-eyebrow font-sans text-base">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </FadeIn>
  );

  if (bare) return content;

  return <div className={cn(SLEDGE_PAGE_CONTAINER, "py-24")}>{content}</div>;
}
