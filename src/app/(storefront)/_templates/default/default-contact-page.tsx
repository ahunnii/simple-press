import type { DefaultContactPageTemplateProps } from "../types";

import { DefaultContactForm } from "./default-contact-form";

export function DefaultContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Contact Us</h1>
          <p className="mb-8 text-gray-600">
            Have a question? We&apos;d love to hear from you. Send us a message
            and we&apos;ll respond as soon as possible.
          </p>

          <DefaultContactForm businessName={business.name} />
        </div>
      </div>
    </div>
  );
}
