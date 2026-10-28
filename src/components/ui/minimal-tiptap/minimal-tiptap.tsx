import "./styles/index.css";

import type { Content, Editor } from "@tiptap/react";
import { EditorContent, EditorContext } from "@tiptap/react";

import type { UseMinimalTiptapEditorProps } from "./hooks/use-minimal-tiptap";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";

import { BlockSideMenu } from "./components/block-handle/block-side-menu";
import { ColumnsBubbleMenu } from "./components/bubble-menu/columns-bubble-menu";
import { ImageBubbleMenu } from "./components/bubble-menu/image-bubble-menu";
import { LinkBubbleMenu } from "./components/bubble-menu/link-bubble-menu";
import { SpacerBubbleMenu } from "./components/bubble-menu/spacer-bubble-menu";
import { TableBubbleMenu } from "./components/bubble-menu/table-bubble-menu";
import { InsertDialogProvider } from "./components/insert-dialog-context";
import { MeasuredContainer } from "./components/measured-container";
import { SectionFive } from "./components/section/five";
import { SectionFour } from "./components/section/four";
import { SectionHistory } from "./components/section/history";
import { SectionOne } from "./components/section/one";
import { SectionSix } from "./components/section/six";
import { SectionThree } from "./components/section/three";
import { SectionTwo } from "./components/section/two";
import { SlashMenu } from "./components/slash-menu/slash-menu";
import { useMinimalTiptapEditor } from "./hooks/use-minimal-tiptap";

export interface MinimalTiptapProps extends Omit<
  UseMinimalTiptapEditorProps,
  "onUpdate"
> {
  value?: Content;
  onChange?: (value: Content) => void;
  className?: string;
  editorContentClassName?: string;
  /**
   * Adds "Columns" and "Collapsible section" to the Insert menu. The nodes
   * themselves are always in the schema (so existing content renders and
   * round-trips); this only gates the insert items.
   */
  layoutBlocksEnabled?: boolean;
  /**
   * Adds the "Products" block to the Insert menu and "/" menu in email
   * mode. Pass the `products` feature flag. The node itself is registered in
   * every email-mode editor (so saved blocks still render); this only gates
   * inserting new ones.
   */
  productsEnabled?: boolean;
}

// Module-level so the arrays are stable props for the toolbar sections.
const ALL_HEADING_LEVELS: Array<1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6];
const EMAIL_HEADING_LEVELS: Array<1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3];

const Toolbar = ({
  editor,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
  layoutBlocksEnabled,
  productsEnabled,
  emailMode,
}: {
  editor: Editor;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
  layoutBlocksEnabled?: boolean;
  productsEnabled?: boolean;
  emailMode?: boolean;
}) => (
  <div className="border-border flex h-12 shrink-0 overflow-x-auto border-b p-2">
    <div className="flex w-max items-center gap-px">
      <SectionHistory editor={editor} />

      <Separator orientation="vertical" className="mx-2" />

      <SectionOne
        editor={editor}
        activeLevels={emailMode ? EMAIL_HEADING_LEVELS : ALL_HEADING_LEVELS}
      />

      <Separator orientation="vertical" className="mx-2" />

      <SectionTwo
        editor={editor}
        activeActions={
          emailMode
            ? [
                "bold",
                "italic",
                "underline",
                "strikethrough",
                "highlight",
                "superscript",
                "subscript",
                "clearFormatting",
              ]
            : [
                "bold",
                "italic",
                "underline",
                "strikethrough",
                "highlight",
                "superscript",
                "subscript",
                "code",
                "clearFormatting",
              ]
        }
        mainActionCount={3}
      />

      <Separator orientation="vertical" className="mx-2" />

      {/* Storefront renderer drops text color; email renders it, so the picker is email-only. */}
      {emailMode && (
        <>
          <SectionThree editor={editor} emailSafe />

          <Separator orientation="vertical" className="mx-2" />
        </>
      )}

      <SectionFour
        editor={editor}
        activeActions={["orderedList", "bulletList"]}
        mainActionCount={0}
      />

      <Separator orientation="vertical" className="mx-2" />

      <SectionSix editor={editor} />

      <Separator orientation="vertical" className="mx-2" />

      <SectionFive
        editor={editor}
        emailMode={emailMode}
        mainActionCount={0}
        galleriesEnabled={galleriesEnabled}
        embedsEnabled={embedsEnabled}
        quotesEnabled={quotesEnabled}
        formsEnabled={formsEnabled}
        layoutBlocksEnabled={layoutBlocksEnabled}
        productsEnabled={productsEnabled}
      />
    </div>
  </div>
);

export const MinimalTiptapEditor = ({
  value,
  onChange,
  className,
  editorContentClassName,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
  layoutBlocksEnabled,
  productsEnabled,
  emailMode,
  ...props
}: MinimalTiptapProps) => {
  const editor = useMinimalTiptapEditor({
    value,
    onUpdate: onChange,
    galleriesEnabled,
    embedsEnabled,
    quotesEnabled,
    formsEnabled,
    emailMode,
    ...props,
  });

  if (!editor) {
    return null;
  }

  return (
    <EditorContext.Provider value={{ editor }}>
      <MainMinimalTiptapEditor
        editor={editor}
        className={className}
        editorContentClassName={editorContentClassName}
        galleriesEnabled={galleriesEnabled}
        embedsEnabled={embedsEnabled}
        quotesEnabled={quotesEnabled}
        formsEnabled={formsEnabled}
        layoutBlocksEnabled={layoutBlocksEnabled}
        productsEnabled={productsEnabled}
        emailMode={emailMode}
      />
    </EditorContext.Provider>
  );
};

MinimalTiptapEditor.displayName = "MinimalTiptapEditor";

export default MinimalTiptapEditor;

export const MainMinimalTiptapEditor = ({
  editor: providedEditor,
  className,
  editorContentClassName,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
  layoutBlocksEnabled,
  productsEnabled,
  emailMode,
}: MinimalTiptapProps & { editor: Editor }) => {
  // Use provided editor directly. Do not subscribe to full editor state here,
  // or every transaction (e.g. from gallery) re-renders the whole toolbar and
  // can cause "Maximum update depth exceeded". Each section subscribes narrowly
  // via useEditorState where it needs to reflect selection/active state.
  if (!providedEditor) {
    return null;
  }

  return (
    <MeasuredContainer
      as="div"
      name="editor"
      className={cn(
        "border-input min-data-[orientation=vertical]:h-72 relative flex h-auto w-full min-w-0 flex-col rounded-md border shadow-xs",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        className,
      )}
    >
      {/* Shares the insert dialogs' open state between their toolbar
          buttons and the "/" menu. */}
      <InsertDialogProvider>
        <Toolbar
          editor={providedEditor}
          galleriesEnabled={galleriesEnabled}
          embedsEnabled={embedsEnabled}
          quotesEnabled={quotesEnabled}
          formsEnabled={formsEnabled}
          layoutBlocksEnabled={layoutBlocksEnabled}
          productsEnabled={productsEnabled}
          emailMode={emailMode}
        />
        <EditorContent
          editor={providedEditor}
          className={cn("minimal-tiptap-editor", editorContentClassName)}
        />
        <LinkBubbleMenu editor={providedEditor} />
        {!emailMode && <TableBubbleMenu editor={providedEditor} />}
        {!emailMode && <ColumnsBubbleMenu editor={providedEditor} />}
        {/* Spacers are registered in every editor, email included. */}
        <SpacerBubbleMenu editor={providedEditor} />
        <ImageBubbleMenu editor={providedEditor} />
        {/* After EditorContent: the side menu is positioned against this
            (relative) frame and hidden by CSS when the editor is read-only. */}
        <BlockSideMenu editor={providedEditor} />
        <SlashMenu
          editor={providedEditor}
          emailMode={emailMode}
          galleriesEnabled={galleriesEnabled}
          embedsEnabled={embedsEnabled}
          quotesEnabled={quotesEnabled}
          formsEnabled={formsEnabled}
          layoutBlocksEnabled={layoutBlocksEnabled}
          productsEnabled={productsEnabled}
        />
      </InsertDialogProvider>
    </MeasuredContainer>
  );
};
