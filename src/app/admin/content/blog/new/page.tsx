import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { TrailHeader } from "~/app/admin/_components/trail-header";

import { BlogPostEditor } from "../_components/blog-page-editor";

export default async function NewBlogPostPage() {
  const flags = await getBusinessFlags();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Blog", href: "/admin/content/blog" },
          { label: "New Blog Post" },
        ]}
      />
      <BlogPostEditor galleriesEnabled={flags.isEnabled("galleries")} embedsEnabled={flags.isEnabled("embeds")} />
    </>
  );
}

export const metadata = {
  title: "New Blog Post",
};
