import { TrailHeader } from "../../_components/trail-header";
import { FormBuilder } from "../_components/form-builder";

export default function NewFormPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Forms", href: "/admin/forms" },
          { label: "New form" },
        ]}
      />
      <FormBuilder />
    </>
  );
}

export const metadata = {
  title: "New Form",
};
