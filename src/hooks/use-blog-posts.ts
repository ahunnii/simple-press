import type { Page } from "generated/prisma";
import { useMemo, useState } from "react";

import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";

export function useBlogPosts(pages: Page[], author?: string) {
  const [query, setQuery] = useState("");

  const allPosts = useMemo(
    () =>
      pages.map((p, idx) => ({
        ...p,
        featured: idx === 0,
        ...(author ? { author } : {}),
      })),
    [pages, author],
  ) as (Page & { featured: boolean; author?: string })[];

  const postsWithSearch = useMemo(
    () =>
      allPosts.map((post) => ({
        post,
        searchBlob: buildBlogSearchBlob(post),
      })),
    [allPosts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPosts;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, q))
      .map(({ post }) => post);
  }, [query, allPosts, postsWithSearch]);

  const featuredResult =
    query.trim() === "" ? filtered.find((p) => p.featured) : null;
  const listResults =
    query.trim() === "" ? filtered.filter((p) => !p.featured) : filtered;

  return {
    allPosts,
    filtered,
    featuredResult,
    listResults,
    setQuery,
    query,
  };
}
