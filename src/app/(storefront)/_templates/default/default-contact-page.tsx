import type { DefaultContactPageTemplateProps } from "../types";
import { resolveFields } from ".";

import { DefaultContactForm } from "./default-contact-form";

export function DefaultContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.contact.heading",
    "default.contact.description",
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {f["default.contact.heading"]}
          </h1>
          <p className="mb-8 text-gray-600">
            {f["default.contact.description"]}
          </p>

          <DefaultContactForm />
        </div>
      </div>
    </div>
  );
}
