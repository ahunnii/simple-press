/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { QuoteCalculatorNodeView } from "./quote-calculator-node-view";

export interface QuoteCalculatorOptions {
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
      insertQuoteCalculator: (attrs?: { calculatorId?: string }) => ReturnType;
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
        parseHTML: (element) => element.getAttribute("data-quote-calculator-id"),
        renderHTML: (attributes) => {
          if (!attributes.calculatorId) {
            return {};
          }
          return {
            "data-quote-calculator-id": attributes.calculatorId,
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
            attrs: {
              ...attrs,
              businessId: this.options.businessId,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteCalculatorNodeView);
  },
});
