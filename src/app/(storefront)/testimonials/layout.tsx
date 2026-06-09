import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";

export default async function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled } = await getBusinessFlags();

  if (!isEnabled("testimonials")) {
    notFound();
  }

  return <>{children}</>;
}
