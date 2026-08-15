import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { TrailHeader } from "~/app/admin/_components/trail-header";

import { PageEditor } from "../_components/page-editor";

export default async function NewPagePage() {
  const flags = await getBusinessFlags();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Pages", href: "/admin/content/pages" },
          { label: "New Page" },
        ]}
      />
      <PageEditor
        galleriesEnabled={flags.isEnabled("galleries")}
        embedsEnabled={flags.isEnabled("embeds")}
        quotesEnabled={flags.isEnabled("quoteCalculator")}
      />
    </>
  );
}

export const metadata = {
  title: "New Page",
};
