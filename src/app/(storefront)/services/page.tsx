import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function ServicesPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const { isEnabled } = await getBusinessFlags();

  // ── Services feature DISABLED → legacy template fallback ──────────────────
  if (!isEnabled("services")) {
    const t = getTemplate(business.templateId);
    if (!t.ServicesPage) {
      notFound();
    }
    return <t.ServicesPage business={business} />;
  }

  // ── Services feature ENABLED → theme-aware index ──────────────────────────
  const services = await api.services.getAllPublic();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Services
          </h1>
        </header>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No services available yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {service.image ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted" />
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {service.name}
                  </h2>
                  {service.description && (
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {service.description}
                    </p>
                  )}
                  <span className="mt-3 self-start text-sm font-medium text-primary">
                    Learn more &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata = {
  title: "Services",
};
