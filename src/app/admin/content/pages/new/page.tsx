import { TrailHeader } from "~/app/admin/_components/trail-header";

import { PageEditor } from "../../_components/page-editor";

export default async function NewPagePage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Custom Pages", href: "/admin/content/pages" },
          { label: "New Page" },
        ]}
      />
      <PageEditor />
    </>
  );
}

export const metadata = {
  title: "New Page",
};
