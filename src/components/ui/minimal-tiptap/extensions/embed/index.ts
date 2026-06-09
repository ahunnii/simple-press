import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { EmbedNodeView } from "./embed-node-view";

export interface EmbedOptions {
  embedsEnabled?: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      /**
       * Insert an embed (iframe)
       */
      insertEmbed: (attrs?: {
        src?: string;
        height?: number;
        title?: string;
      }) => ReturnType;
    };
  }
}

export const Embed = Node.create<EmbedOptions>({
  name: "embed",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      embedsEnabled: true,
      HTMLAttributes: {
        class: "embed-block",
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) => {
          const src = attributes.src as string | null;
          if (!src) {
            return {};
          }
          return {
            "data-src": src,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute("data-height");
          if (v == null) return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attributes) => {
          const height = attributes.height as number | null;
          if (height == null) {
            return {};
          }
          return {
            "data-height": height,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => {
          const title = attributes.title as string | null;
          if (!title) {
            return {};
          }
          return {
            "data-title": title,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "embed",
        class: "embed-block",
      }),
    ];
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attrs ?? {},
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },
});
