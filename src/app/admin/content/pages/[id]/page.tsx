/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { PageEditor } from "../../_components/page-editor";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  const page = await api.content.getPage({
    id,
  });

  if (!page) {
    notFound();
  }

  return <PageEditor business={business} page={page} />;
}
