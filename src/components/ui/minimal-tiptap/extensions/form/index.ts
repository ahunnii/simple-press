/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { FormNodeView } from "./form-node-view";

/**
 * Editor-side `form` node — an embedded reference to a `Form` (see
 * `~/lib/validators/form.ts` / `~/server/api/routers/form.ts`), the same
 * shape as `quoteCalculator`.
 *
 * Only a `formId` is stored on the node. Tenant scoping happens server-side
 * from the request host on both the picker query (`api.form.list`) and the
 * storefront read (`api.form.getByIdPublic`) — no business id belongs on the
 * node or in the published HTML.
 */
export interface FormOptions {
  formsEnabled?: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    form: {
      /**
       * Insert a form embed.
       */
      insertForm: (attrs?: { formId?: string }) => ReturnType;
    };
  }
}

export const Form = Node.create<FormOptions>({
  name: "form",

  group: "block",

  atom: true,

  addOptions() {
    return {
      formsEnabled: true,
      HTMLAttributes: {
        class: "form-block",
      },
    };
  },

  addAttributes() {
    return {
      formId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-form-id"),
        renderHTML: (attributes) => {
          if (!attributes.formId) {
            return {};
          }
          return {
            "data-form-id": attributes.formId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="form"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "form",
      }),
    ];
  },

  addCommands() {
    return {
      insertForm:
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
    return ReactNodeViewRenderer(FormNodeView);
  },
});
