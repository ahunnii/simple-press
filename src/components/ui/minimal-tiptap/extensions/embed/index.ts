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
        aspectRatio?: string | null;
        maxWidth?: string | null;
        displayMode?: string | null;
        triggerLabel?: string | null;
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
      aspectRatio: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-aspect-ratio"),
        renderHTML: (attributes) => {
          const aspectRatio = attributes.aspectRatio as string | null;
          if (!aspectRatio) {
            return {};
          }
          return {
            "data-aspect-ratio": aspectRatio,
          };
        },
      },
      maxWidth: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-max-width"),
        renderHTML: (attributes) => {
          const maxWidth = attributes.maxWidth as string | null;
          if (!maxWidth) {
            return {};
          }
          return {
            "data-max-width": maxWidth,
          };
        },
      },
      displayMode: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-display-mode"),
        renderHTML: (attributes) => {
          const displayMode = attributes.displayMode as string | null;
          if (!displayMode) {
            return {};
          }
          return {
            "data-display-mode": displayMode,
          };
        },
      },
      triggerLabel: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-trigger-label"),
        renderHTML: (attributes) => {
          const triggerLabel = attributes.triggerLabel as string | null;
          if (!triggerLabel) {
            return {};
          }
          return {
            "data-trigger-label": triggerLabel,
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
