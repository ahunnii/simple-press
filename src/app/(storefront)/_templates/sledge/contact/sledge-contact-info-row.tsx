import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  lines: string[];
  links?: (string | null)[];
};

export function SledgeContactInfoRow({
  icon: Icon,
  title,
  lines,
  links,
}: Props) {
  return (
    <div className="flex gap-4">
      <Icon
        className="mt-1 h-5 w-5 shrink-0 text-[var(--sl-coral)]"
        aria-hidden
      />
      <div>
        <h3 className="mb-2 text-[clamp(1.25rem,2.5vw,1.5625rem)] leading-[1.2] font-bold tracking-[0.04em] text-[var(--sl-coral)] uppercase">
          {title}
        </h3>
        <div className="text-[1.09375rem] leading-relaxed text-[var(--sl-ink)]">
          {lines.map((line, i) => {
            const href = links?.[i];
            return href ? (
              <a
                key={i}
                href={href}
                className="block transition-opacity hover:opacity-70"
              >
                {line}
              </a>
            ) : (
              <span key={i} className="block">
                {line}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
