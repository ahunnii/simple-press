import { notFound } from "next/navigation";
import type { ClubFormData } from "~/lib/validators/club";
import { api } from "~/trpc/server";
import { SiteHeader } from "../../_components/site-header";
import { ClubForm } from "../_components/club-form";

type Props = {
  params: Promise<{ clubId: string }>;
};

export const generateMetadata = async ({ params }: Props) => {
  const { clubId } = await params;
  const club = await api.club.getById(clubId);
  if (!club) notFound();
  return {
    title: `Edit ${club.name}`,
  };
};

export default async function AdminClubPage({ params }: Props) {
  const { clubId } = await params;
  const club = await api.club.getById(clubId);
  if (!club) notFound();

  const defaultValues: ClubFormData = {
    name: club.name,
    slug: club.slug,
    description: club.description ?? undefined,
    image: club.image ?? undefined,
    logo: club.logo ?? undefined,
    type: club.type,
    isFeatured: club.isFeatured,
    tagline: club.tagline ?? undefined,
    quickDescription: club.quickDescription ?? undefined,
    email: club.email ?? undefined,
    highlights: club.highlights ?? [],
    leaders: (club.leaders ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      role: l.role,
      image: l.image ?? undefined,
    })),
    resources: (club.resources ?? []).map((r) => ({
      id: r.id,
      url: r.url,
      name: r.name,
      type: r.type ?? undefined,
    })),
    gallery: (club.gallery ?? []).map((g) => ({
      id: g.id,
      url: g.url,
      alt: g.alt,
    })),
  };

  return (
    <>
      <SiteHeader title={club.name} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <ClubForm clubId={clubId} defaultValues={defaultValues} />
          </div>
        </div>
      </div>
    </>
  );
}
