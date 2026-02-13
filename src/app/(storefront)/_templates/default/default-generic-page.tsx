import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";

export function DefaultGenericPage({
  page,
}: {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold">{page.title}</h1>

      {page.excerpt && (
        <p className="mb-8 text-xl text-gray-600">{page.excerpt}</p>
      )}

      <TiptapRenderer
        content={page.content as TiptapJSON}
        className="prose prose-lg max-w-none"
      />
    </div>
  );
}
