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

  const t = getTemplate(business.templateId);
  if (t.ServicesIndexPage) {
    return <t.ServicesIndexPage business={business} services={services} />;
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
            Services
          </h1>
        </header>

        {services.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
            <p className="text-muted-foreground text-lg font-medium">
              No services available yet.
            </p>
            <p className="text-muted-foreground/70 mt-1 text-sm">
              Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group border-border bg-card focus-visible:ring-ring flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
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
                  <div className="bg-muted aspect-video w-full" />
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="text-foreground group-hover:text-primary text-lg font-semibold transition-colors">
                    {service.name}
                  </h2>
                  {service.description && (
                    <p className="text-muted-foreground line-clamp-3 flex-1 text-sm leading-relaxed">
                      {service.description}
                    </p>
                  )}
                  <span className="text-primary mt-3 self-start text-sm font-medium">
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
