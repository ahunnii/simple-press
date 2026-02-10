import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { CollectionForm } from "../_components/collection-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { businessId: true },
  });

  if (!user?.businessId) {
    redirect("/admin/welcome");
  }

  return <CollectionForm businessId={user.businessId} collectionId={id} />;
}
