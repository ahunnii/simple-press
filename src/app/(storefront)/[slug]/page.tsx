import { notFound } from "next/navigation";

import { db } from "~/server/db";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export default async function PageView({
  params,
}: {
  params: { slug: string };
}) {
  const page = await db.page.findFirst({
    where: {
      slug: params.slug,
      published: true,
    },
  });

  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold">{page.title}</h1>

      {page.excerpt && (
        <p className="mb-8 text-xl text-gray-600">{page.excerpt}</p>
      )}

      <TiptapRenderer
        content={page.content}
        className="prose prose-lg max-w-none"
      />
    </div>
  );
}
