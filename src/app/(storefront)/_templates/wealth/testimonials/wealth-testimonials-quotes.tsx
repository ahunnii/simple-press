import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

type Props = {
  heading: string;
  emptyMessage: string;
  testimonials: Testimonial[];
};

/**
 * "In their words" — approved DB testimonials rendered as quiet pull-quotes
 * (Titillium body, hairline rules between them), only when approved items
 * exist. Otherwise renders the designed empty state. Per the playbook
 * contract, testimonials come from `api.testimonial.list({ publicOnly: true })`
 * fetched by the page server component.
 */
export function WealthTestimonialsQuotes({
  heading,
  emptyMessage,
  testimonials,
}: Props) {
  return (
    <section
      aria-label="In their words"
      {...sectionGroupAttr("testimonials", "quotes")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[760px] px-[var(--wealth-gutter)] text-center">
        <h2
          {...fieldAttr("wealth.testimonials.quotes-heading")}
          className="wealth-section-heading"
        >
          {heading}
        </h2>

        {testimonials.length > 0 ? (
          <ul className="mt-[calc(var(--wealth-rhythm)*1.5)] list-none text-left">
            {testimonials.map((t, i) => (
              <li
                key={t.id}
                className="border-t border-[var(--wealth-surface-2)] pt-[var(--wealth-rhythm)] first:border-t-0 first:pt-0"
                style={i > 0 ? { marginTop: "var(--wealth-rhythm)" } : undefined}
              >
                <blockquote className="m-0">
                  <p
                    style={{
                      fontFamily: "var(--font-wealth-body)",
                      fontStyle: "italic",
                      fontSize: "17px",
                      lineHeight: "25.5px",
                    }}
                  >
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <footer className="mt-2">
                    <cite
                      className="not-italic text-sm"
                      style={{ color: "var(--wealth-muted)" }}
                    >
                      — {t.customerName}
                      {t.customerCompany ? `, ${t.customerCompany}` : ""}
                    </cite>
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
        ) : (
          <p
            {...fieldAttr("wealth.testimonials.quotes-empty-message")}
            className="mt-[var(--wealth-rhythm)]"
            style={{ color: "var(--wealth-muted)" }}
          >
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}
