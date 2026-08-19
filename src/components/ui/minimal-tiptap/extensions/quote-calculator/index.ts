/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { QuoteCalculatorNodeView } from "./quote-calculator-node-view";

export interface QuoteCalculatorOptions {
  /**
   * Accepted but UNUSED — kept only so the shared `configure()` call in
   * `use-minimal-tiptap.ts` (which passes the same `businessId` to the Gallery
   * extension, where it IS used) keeps type-checking.
   *
   * It used to be written into the node's attributes and serialized into the
   * published HTML as `data-business-id`. That put an internal tenant id on
   * every public page carrying a calculator, for nothing: the server resolves
   * the tenant from the Host header on every read and write, and never once
   * consults the attribute. Do not reintroduce it.
   */
  businessId?: string;
  quotesEnabled?: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    quoteCalculator: {
      /**
       * Insert a quote calculator
       */
      insertQuoteCalculator: (attrs?: {
        calculatorId?: string;
        width?: string;
        height?: string;
        density?: string;
        layout?: string;
      }) => ReturnType;
    };
  }
}

export const QuoteCalculator = Node.create<QuoteCalculatorOptions>({
  name: "quoteCalculator",

  group: "block",

  atom: true,

  addOptions() {
    return {
      businessId: undefined,
      quotesEnabled: true,
      HTMLAttributes: {
        class: "quote-calculator-block",
      },
    };
  },

  addAttributes() {
    return {
      calculatorId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-quote-calculator-id"),
        renderHTML: (attributes) => {
          if (!attributes.calculatorId) {
            return {};
          }
          return {
            "data-quote-calculator-id": attributes.calculatorId,
          };
        },
      },
      // No `businessId` attribute. The node needs exactly one thing to render:
      // which calculator. Tenant comes from the request host, server-side, on
      // both the public read (`quoteCalculator.getByIdPublic`) and the submit.
      // Documents saved before this change still parse — the stale
      // `data-business-id` in their stored HTML is simply dropped as an
      // unknown attribute, and re-saving them cleans it out of the output.
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-quote-width"),
        renderHTML: (attributes) => {
          const width = attributes.width as string | null;
          if (!width) {
            return {};
          }
          return {
            "data-quote-width": width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-quote-height"),
        renderHTML: (attributes) => {
          const height = attributes.height as string | null;
          if (!height) {
            return {};
          }
          return {
            "data-quote-height": height,
          };
        },
      },
      density: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-quote-density"),
        renderHTML: (attributes) => {
          const density = attributes.density as string | null;
          if (!density) {
            return {};
          }
          return {
            "data-quote-density": density,
          };
        },
      },
      layout: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-quote-layout"),
        renderHTML: (attributes) => {
          const layout = attributes.layout as string | null;
          if (!layout) {
            return {};
          }
          return {
            "data-quote-layout": layout,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="quote-calculator"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "quote-calculator",
      }),
    ];
  },

  addCommands() {
    return {
      insertQuoteCalculator:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...attrs },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteCalculatorNodeView);
  },
});
