import { notFound } from "next/navigation";

import { JsonLd } from "~/components/json-ld";
import { getCanonicalUrl } from "~/lib/canonical";
import { buildFaqSchema } from "~/lib/structured-data";
import { api } from "~/trpc/server";

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();
  return {
    title: "FAQ",
    description: `Frequently asked questions about ${business?.name ?? "our store"}.`,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/faq"),
      },
    }),
  };
}

export default async function FaqPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const items = await api.faq.list();

  return (
    <>
      {items.length > 0 && (
        <JsonLd
          data={buildFaqSchema(
            items.map((i) => ({ question: i.question, answer: i.answer })),
          )}
        />
      )}

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h1>
          {items.length > 0 && (
            <p className="mt-3 text-base text-muted-foreground">
              Answers to common questions about {business.name}.
            </p>
          )}
        </header>

        {items.length === 0 ? (
          <p className="text-muted-foreground">
            No FAQ items available yet. Check back soon.
          </p>
        ) : (
          <dl className="space-y-0 divide-y divide-border rounded-lg border">
            {items.map((item) => (
              <FaqAccordionItem
                key={item.id}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </dl>
        )}
      </main>
    </>
  );
}

// ─── Accordion item (client-interactive details/summary) ─────────────────────
// Using native <details>/<summary> gives keyboard + screen-reader support with
// zero JS — each item is independently expandable without a client component.

function FaqAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group px-6 py-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm">
        <span>{question}</span>
        {/* Chevron rotates via CSS — no JS required */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {answer}
      </div>
    </details>
  );
}
