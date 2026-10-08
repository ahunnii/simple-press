"use client";

import { useEffect, useState } from "react";

import { GloveShareRow } from "../shared";

type GloveBlogShareProps = {
  title: string;
  /** Site-relative path, e.g. "/blog/my-post". */
  path: string;
  image?: string;
};

/**
 * Share row for a post. Share links need an absolute URL, and the storefront
 * origin (subdomain or custom domain) is only known in the browser, so the
 * origin is read after mount. The first paint uses the bare path so there is
 * no hydration mismatch.
 */
export function GloveBlogShare({ title, path, image }: GloveBlogShareProps) {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return <GloveShareRow url={`${origin}${path}`} title={title} image={image} />;
}
