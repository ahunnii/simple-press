import { fieldAttr } from "~/lib/preview/section-attrs";

type PinkEyebrowProps = {
  children: React.ReactNode;
  /** paper → rose (default), dark → blush, photo → petal (design.md → Shared component inventory). */
  tone?: "paper" | "dark" | "photo";
  className?: string;
  fieldKey?: string;
  as?: "p" | "span" | "div";
};

const TONE_CLASS: Record<NonNullable<PinkEyebrowProps["tone"]>, string> = {
  paper: "pink-eyebrow",
  dark: "pink-eyebrow pink-eyebrow-dark",
  photo: "pink-eyebrow pink-eyebrow-photo",
};

/**
 * `13px` / `.14em` / uppercase label. Server-safe — no client hooks.
 * Pass `fieldKey` when the entire text content is one resolved field's
 * value so the visual editor can live-patch it.
 */
export function PinkEyebrow({
  children,
  tone = "paper",
  className,
  fieldKey,
  as = "p",
}: PinkEyebrowProps) {
  const Tag = as;
  return (
    <Tag
      className={`${TONE_CLASS[tone]}${className ? ` ${className}` : ""}`}
      {...(fieldKey ? fieldAttr(fieldKey) : {})}
    >
      {children}
    </Tag>
  );
}
