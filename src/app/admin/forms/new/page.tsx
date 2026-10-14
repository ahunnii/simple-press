import { getBusinessFlags } from "~/lib/features/get-business-flags";

import { FormBuilder } from "../_components/form-builder";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewFormPage() {
  const flags = await getBusinessFlags();
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Forms", href: "/admin/forms" },
          { label: "New form" },
        ]}
      />
      <FormBuilder mediaLibraryEnabled={flags.isEnabled("media")} />
    </>
  );
}

export const metadata = {
  title: "New Form",
};
