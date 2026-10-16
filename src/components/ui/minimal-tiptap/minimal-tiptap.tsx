import "./styles/index.css";

import type { Content, Editor } from "@tiptap/react";
import { EditorContent, EditorContext } from "@tiptap/react";

import type { UseMinimalTiptapEditorProps } from "./hooks/use-minimal-tiptap";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";

import { ColumnsBubbleMenu } from "./components/bubble-menu/columns-bubble-menu";
import { LinkBubbleMenu } from "./components/bubble-menu/link-bubble-menu";
import { TableBubbleMenu } from "./components/bubble-menu/table-bubble-menu";
import { MeasuredContainer } from "./components/measured-container";
import { SectionFive } from "./components/section/five";
import { SectionFour } from "./components/section/four";
import { SectionOne } from "./components/section/one";
import { SectionSix } from "./components/section/six";
import { SectionThree } from "./components/section/three";
import { SectionTwo } from "./components/section/two";
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
}

const Toolbar = ({
  editor,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
  layoutBlocksEnabled,
}: {
  editor: Editor;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
  layoutBlocksEnabled?: boolean;
}) => (
  <div className="border-border flex h-12 shrink-0 overflow-x-auto border-b p-2">
    <div className="flex w-max items-center gap-px">
      <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />

      <Separator orientation="vertical" className="mx-2" />

      <SectionTwo
        editor={editor}
        activeActions={[
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "code",
          "clearFormatting",
        ]}
        mainActionCount={3}
      />

      <Separator orientation="vertical" className="mx-2" />

      <SectionThree editor={editor} />

      <Separator orientation="vertical" className="mx-2" />

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
        activeActions={[
          "codeBlock",
          "blockquote",
          "horizontalRule",
          "gallery",
          "embed",
          "quoteCalculator",
          "form",
          "table",
          "columns",
          "details",
        ]}
        mainActionCount={0}
        galleriesEnabled={galleriesEnabled}
        embedsEnabled={embedsEnabled}
        quotesEnabled={quotesEnabled}
        formsEnabled={formsEnabled}
        layoutBlocksEnabled={layoutBlocksEnabled}
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
  ...props
}: MinimalTiptapProps) => {
  const editor = useMinimalTiptapEditor({
    value,
    onUpdate: onChange,
    galleriesEnabled,
    embedsEnabled,
    quotesEnabled,
    formsEnabled,
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
        "border-input min-data-[orientation=vertical]:h-72 flex h-auto w-full flex-col rounded-md border shadow-xs",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        className,
      )}
    >
      <Toolbar
        editor={providedEditor}
        galleriesEnabled={galleriesEnabled}
        embedsEnabled={embedsEnabled}
        quotesEnabled={quotesEnabled}
        formsEnabled={formsEnabled}
        layoutBlocksEnabled={layoutBlocksEnabled}
      />
      <EditorContent
        editor={providedEditor}
        className={cn("minimal-tiptap-editor", editorContentClassName)}
      />
      <LinkBubbleMenu editor={providedEditor} />
      <TableBubbleMenu editor={providedEditor} />
      <ColumnsBubbleMenu editor={providedEditor} />
    </MeasuredContainer>
  );
};
