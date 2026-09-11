import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  heading: string;
  members: TemplateListRow[];
};

/**
 * Centered italic H2 + uppercase Jost-semibold display lines for each board
 * member, colored via `--wealth-eyebrow` per design.md's a11y note (the
 * eyebrow COLOR, not the mono eyebrow font — board names use the display
 * typeface per design.md's Typography section). Hideable (about.board).
 */
export function WealthAboutBoard({ heading, members }: Props) {
  if (members.length === 0) return null;

  return (
    <section
      aria-label="Board of Directors"
      {...sectionGroupAttr("about", "board")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[720px] px-[var(--wealth-gutter)] text-center">
        <h2
          {...fieldAttr("wealth.about.board-heading")}
          className="wealth-section-heading"
        >
          {heading}
        </h2>
        <ul className="mt-[var(--wealth-rhythm)] list-none">
          {members.map((member, i) => {
            const name = typeof member.name === "string" ? member.name : "";
            if (!name.trim()) return null;
            return (
              <li
                key={member._id ?? i}
                className="mt-[13px] first:mt-0"
                style={{
                  fontFamily: "var(--font-wealth-display)",
                  fontWeight: 600,
                  fontSize: "13px",
                  lineHeight: "17px",
                  letterSpacing: "1.69px",
                  textTransform: "uppercase",
                  color: "var(--wealth-eyebrow)",
                }}
              >
                {name}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
