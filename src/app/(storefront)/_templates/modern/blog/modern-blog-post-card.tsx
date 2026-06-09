"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/utils";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function ModernBlogPostCard({ post }: { post: Props["pages"][number] }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-card text-card-foreground border-border block overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {/* M-1: alt="" — decorative; title is in the h3 below in the same link */}
        {/* M-11: motion-reduce disables zoom animation */}
        <Image
          src={post.image ?? "/placeholder.svg"}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="p-6">
        <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
          {/* M-2: decorative icon hidden from AT */}
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDate(post.createdAt)}
        </p>
        <h3 className="text-foreground group-hover:text-primary mb-2 font-serif text-lg font-light tracking-wide transition-colors">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {post.excerpt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
