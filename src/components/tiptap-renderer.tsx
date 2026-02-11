/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

type TiptapRendererProps = {
  content: any; // TipTap JSON
  className?: string;
};

const extensions = [
  StarterKit,
  Link,
  Image,
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
];

export function TiptapRenderer({ content, className }: TiptapRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";

    try {
      return generateHTML(content, extensions);
    } catch (error) {
      console.error("Error generating HTML from TipTap content:", error);
      return "";
    }
  }, [content]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
