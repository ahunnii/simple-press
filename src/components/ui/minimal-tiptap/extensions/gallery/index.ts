/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { GalleryNodeView } from "./gallery-node-view";

export interface GalleryOptions {
  businessId?: string;
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      /**
       * Insert a gallery
       */
      insertGallery: (attrs?: { galleryId?: string }) => ReturnType;
    };
  }
}

export const Gallery = Node.create<GalleryOptions>({
  name: "gallery",

  group: "block",

  atom: true,

  addOptions() {
    return {
      businessId: undefined,
      HTMLAttributes: {
        class: "gallery-block",
      },
    };
  },

  addAttributes() {
    return {
      galleryId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-gallery-id"),
        renderHTML: (attributes) => {
          if (!attributes.galleryId) {
            return {};
          }
          return {
            "data-gallery-id": attributes.galleryId,
          };
        },
      },
      businessId: {
        default: this.options.businessId,
        parseHTML: (element) => element.getAttribute("data-business-id"),
        renderHTML: (attributes) => {
          if (!attributes.businessId) {
            return {};
          }
          return {
            "data-business-id": attributes.businessId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="gallery"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "gallery",
      }),
    ];
  },

  addCommands() {
    return {
      insertGallery:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...attrs,
              businessId: this.options.businessId,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryNodeView);
  },
});
