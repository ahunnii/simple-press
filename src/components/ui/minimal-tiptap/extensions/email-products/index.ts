import { NodeSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

import type { EmailProductsNodeAttrs } from "~/lib/tiptap/email-products-node";
import {
  coerceEmailProductsButtonLabel,
  EmailProducts,
  sanitizeEmailProductItems,
} from "~/lib/tiptap/email-products-node";

import { EmailProductsNodeView } from "./email-products-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emailProducts: {
      /**
       * Insert a product block at the caret (after a node-selected block,
       * never over it). With no items it shows its "Choose products" state.
       */
      insertEmailProducts: (
        attrs?: Partial<EmailProductsNodeAttrs>,
      ) => ReturnType;
      /** Update the node-selected product block's items and/or label. */
      setEmailProducts: (attrs: Partial<EmailProductsNodeAttrs>) => ReturnType;
    };
  }
}

/**
 * Editor-side `emailProducts`: the shared schema node plus a React node view
 * (card preview, picker, button label) and its commands. Only registered in
 * email mode (`createExtensions({ emailMode: true })`).
 */
export const EditorEmailProducts = EmailProducts.extend({
  addCommands() {
    return {
      insertEmailProducts:
        (attrs) =>
        ({ state, commands }) => {
          const content = {
            type: this.name,
            attrs: {
              items: sanitizeEmailProductItems(attrs?.items ?? []),
              buttonLabel: coerceEmailProductsButtonLabel(attrs?.buttonLabel),
            },
          };
          // Inserting over a node selection would replace that block.
          if (state.selection instanceof NodeSelection) {
            return commands.insertContentAt(state.selection.to, content);
          }
          return commands.insertContent(content);
        },

      setEmailProducts:
        (attrs) =>
        ({ state, tr, dispatch }) => {
          const { selection } = state;
          if (
            !(selection instanceof NodeSelection) ||
            selection.node.type.name !== this.name
          ) {
            return false;
          }
          if (!dispatch) return true;
          const next = { ...selection.node.attrs };
          if (attrs.items !== undefined) {
            next.items = sanitizeEmailProductItems(attrs.items);
          }
          if (attrs.buttonLabel !== undefined) {
            next.buttonLabel = coerceEmailProductsButtonLabel(
              attrs.buttonLabel,
            );
          }
          tr.setNodeMarkup(selection.from, undefined, next);
          tr.setSelection(NodeSelection.create(tr.doc, selection.from));
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmailProductsNodeView);
  },
});
