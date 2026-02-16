"use client";

import { useMemo } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

import { GalleryRenderer } from "~/components/gallery-renderer";
import { Gallery } from "~/components/ui/minimal-tiptap/extensions/gallery";
import { api } from "~/trpc/react";

/** TipTap document JSON — matches first parameter of generateHTML */
export type TiptapJSON = Parameters<typeof generateHTML>[0];

type TiptapRendererProps = {
  content: TiptapJSON | null | undefined;
  className?: string;
};

const extensions = [
  StarterKit,
  Link,
  Image,
  Underline,
  TextStyle,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Gallery,
];

/** Renders a single gallery by id (for storefront page content). */
function GalleryBlock({ galleryId }: { galleryId: string }) {
  const { data: gallery, isLoading } = api.gallery.getByIdPublic.useQuery(
    { id: galleryId },
    { enabled: !!galleryId },
  );

  if (!galleryId) return null;
  if (isLoading) {
    return (
      <div className="my-6 flex justify-center rounded-lg border border-gray-200 bg-gray-50 py-12">
        <span className="text-gray-500">Loading gallery…</span>
      </div>
    );
  }
  if (!gallery) return null;

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-gray-200">
      <GalleryRenderer
        gallery={{
          name: gallery.name,
          description: gallery.description,
          layout: gallery.layout,
          columns: gallery.columns,
          gap: gallery.gap,
          showCaptions: gallery.showCaptions,
          enableLightbox: gallery.enableLightbox,
          images: gallery.images.map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            caption: img.caption,
          })),
        }}
      />
    </div>
  );
}

/** TipTap node (minimal shape we need for content walk). */
type ContentNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
};

function isGalleryNode(node: ContentNode): node is ContentNode & { attrs: { galleryId?: string } } {
  return node.type === "gallery" && node.attrs != null && "galleryId" in node.attrs;
}

export function TiptapRenderer({ content, className }: TiptapRendererProps) {
  const elements = useMemo(() => {
    if (!content || typeof content !== "object" || !Array.isArray((content as { content?: ContentNode[] }).content)) {
      return [];
    }

    const nodes = (content as { content: ContentNode[] }).content;
    return nodes.map((node, index) => {
      if (isGalleryNode(node) && node.attrs.galleryId) {
        return (
          <GalleryBlock
            key={`gallery-${node.attrs.galleryId}-${index}`}
            galleryId={String(node.attrs.galleryId)}
          />
        );
      }
      try {
        const html = generateHTML(
          { type: "doc", content: [node] as Parameters<typeof generateHTML>[0]["content"] },
          extensions,
        );
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return null;
      }
    });
  }, [content]);

  return <div className={className}>{elements}</div>;
}
