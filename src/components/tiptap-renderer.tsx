"use client";

import { useMemo } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

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
