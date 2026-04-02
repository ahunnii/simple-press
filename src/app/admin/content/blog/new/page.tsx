import { TrailHeader } from "~/app/admin/_components/trail-header";

import { BlogPostEditor } from "../_components/blog-page-editor";

export default async function NewPagePage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Blog", href: "/admin/content/blog" },
          { label: "New Blog Post" },
        ]}
      />
      <BlogPostEditor />
    </>
  );
}

export const metadata = {
  title: "New Blog Post",
};
