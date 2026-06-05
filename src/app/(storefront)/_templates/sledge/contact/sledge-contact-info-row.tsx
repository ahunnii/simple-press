import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  lines: string[];
  links?: (string | null)[];
};

export function SledgeContactInfoRow({ icon: Icon, title, lines, links }: Props) {
  return (
    <div className="flex gap-4">
      <Icon
        className="mt-1 h-5 w-5 shrink-0"
        style={{ color: "var(--sl-coral)" }}
        aria-hidden
      />
      <div>
        <h3
          className="mb-2 uppercase"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "var(--sl-coral)",
            letterSpacing: "0.04em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        <div
          className="text-sm leading-relaxed"
          style={{ color: "var(--sl-ink)" }}
        >
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
