import { notFound } from "next/navigation";

import { buildPageMetadata } from "~/lib/seo";
import { buildFaqSchema } from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export async function generateMetadata() {
  const business = await api.business.simplifiedGet().catch(() => null);
  return buildPageMetadata({
    business,
    path: "/faq",
    pageMetaKey: "faq",
    title: "FAQ",
    description: `Frequently asked questions about ${business?.name ?? "our store"}.`,
  });
}

export default async function FaqPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const items = await api.faq.list();

  const t = getTemplate(business.templateId);
  // FaqPage is optional in TemplateComponentSet (some templates may never
  // implement it), but defaultEntry always provides one, so this only guards
  // TypeScript's optional-slot typing — it should never 404 in practice.
  if (!t.FaqPage) notFound();

  return (
    <>
      {items.length > 0 && (
        <JsonLd
          data={buildFaqSchema(
            items.map((i) => ({ question: i.question, answer: i.answer })),
          )}
        />
      )}

      <t.FaqPage business={business} items={items} />
    </>
  );
}
