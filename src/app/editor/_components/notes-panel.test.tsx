import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NoteSectionPick } from "./notes-panel";
import type { PendingFile } from "~/components/inputs/pending-image-grid";
import type { UseDeferredImageUpload } from "~/hooks/use-deferred-image-upload";
import type { TemplateSection } from "~/lib/template-sections";

import { NotesPanel } from "./notes-panel";

// The panel talks to `api.editorNote` directly — stub just what it touches.
const trpcMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      editorNote: { listMine: { invalidate: trpcMocks.invalidate } },
    }),
    editorNote: {
      listMine: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
      create: {
        useMutation: () => ({
          mutateAsync: trpcMocks.mutateAsync,
          isPending: false,
        }),
      },
    },
  },
}));

const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  }),
);
vi.mock("sonner", () => ({ toast: toastMock }));

// The real hook pulls in better-upload + image prep; the panel only needs its
// state and a spy on what it forwards.
const upload = vi.hoisted(() => ({
  state: {} as UseDeferredImageUpload,
}));
vi.mock("~/hooks/use-deferred-image-upload", () => ({
  useDeferredImageUpload: () => upload.state,
}));

const SECTIONS: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    groupIds: ["homepage.hero"],
    order: 0,
  },
  {
    id: "homepage.about",
    page: "homepage",
    title: "About",
    groupIds: ["homepage.about"],
    order: 1,
  },
  {
    id: "global.footer",
    page: "global",
    title: "Footer",
    groupIds: ["global.footer"],
    order: 0,
  },
];

function pendingFile(n: number): PendingFile {
  return {
    id: `pending-${n}`,
    previewUrl: `blob:photo-${n}`,
    file: new File(["x"], `photo-${n}.png`, { type: "image/png" }),
  };
}

function setUpload(overrides: Partial<UseDeferredImageUpload> = {}) {
  upload.state = {
    pendingFiles: [],
    isUploading: false,
    isPreparing: false,
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    reorder: vi.fn(),
    clear: vi.fn(),
    uploadAll: vi.fn().mockResolvedValue([]),
    discard: vi.fn(),
    ...overrides,
  };
  return upload.state;
}

function panel(pickedSection: NoteSectionPick | null = null) {
  return (
    <NotesPanel
      activePageKey="homepage"
      activePageLabel="Homepage"
      sections={SECTIONS}
      pickedSection={pickedSection}
      onClose={() => undefined}
    />
  );
}

const scopeCombo = () => screen.getByRole("combobox", { name: "Scope" });
const sectionCombo = () => screen.queryByRole("combobox", { name: "Section" });

beforeEach(() => {
  setUpload();
  trpcMocks.mutateAsync.mockReset();
  trpcMocks.invalidate.mockReset();
  toastMock.warning.mockClear();
  toastMock.error.mockClear();
  toastMock.success.mockClear();
});

describe("NotesPanel scope", () => {
  it("defaults to this page and shows no section select", () => {
    render(panel());
    expect(scopeCombo()).toHaveTextContent("This page: Homepage");
    expect(sectionCombo()).toBeNull();
  });

  it("reveals the section select when scope switches to a section", async () => {
    const user = userEvent.setup();
    render(panel());

    await user.click(scopeCombo());
    await user.click(
      await screen.findByRole("option", { name: "A section on this page" }),
    );

    expect(scopeCombo()).toHaveTextContent("A section on this page");
    expect(sectionCombo()).toBeInTheDocument();
    expect(
      screen.getByText("Or click a section in the preview."),
    ).toBeInTheDocument();
    // No section chosen yet — can't send.
    await user.type(screen.getByLabelText("Note"), "Bigger photo please");
    expect(screen.getByRole("button", { name: "Send note" })).toBeDisabled();

    // Page sections first, then the site-wide group.
    await user.click(sectionCombo()!);
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Hero",
      "About",
      "Footer",
    ]);
    expect(screen.getByText("Site-wide")).toBeInTheDocument();
  });

  it("disables the section option when there are no sections", async () => {
    const user = userEvent.setup();
    render(
      <NotesPanel
        activePageKey="cms:abc"
        activePageLabel="About us"
        sections={[]}
        pickedSection={null}
        onClose={() => undefined}
      />,
    );
    await user.click(scopeCombo());
    expect(
      await screen.findByRole("option", { name: "A section on this page" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("selects a section picked in the preview (new nonces only)", async () => {
    // A pick left over from before the panel mounted is ignored.
    const { rerender } = render(panel({ id: "homepage.about", nonce: 1 }));
    expect(scopeCombo()).toHaveTextContent("This page: Homepage");
    expect(sectionCombo()).toBeNull();

    rerender(panel({ id: "homepage.hero", nonce: 2 }));
    await waitFor(() =>
      expect(scopeCombo()).toHaveTextContent("A section on this page"),
    );
    expect(sectionCombo()).toHaveTextContent("Hero");

    rerender(panel({ id: "global.footer", nonce: 3 }));
    await waitFor(() => expect(sectionCombo()).toHaveTextContent("Footer"));
  });

  it("drops a picked section that isn't on the new page", async () => {
    const { rerender } = render(panel());
    rerender(panel({ id: "homepage.hero", nonce: 1 }));
    await waitFor(() => expect(sectionCombo()).toHaveTextContent("Hero"));

    rerender(
      <NotesPanel
        activePageKey="about"
        activePageLabel="About"
        sections={SECTIONS.filter((s) => s.page === "global")}
        pickedSection={{ id: "homepage.hero", nonce: 1 }}
        onClose={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(sectionCombo()).toHaveTextContent("Choose a section"),
    );
    expect(scopeCombo()).toHaveTextContent("A section on this page");
  });
});

describe("NotesPanel photos", () => {
  const fileInput = (container: HTMLElement) =>
    container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const images = (count: number) =>
    Array.from(
      { length: count },
      (_, i) => new File(["x"], `new-${i}.png`, { type: "image/png" }),
    );

  it("forwards only the files that fit under the cap and toasts", async () => {
    const state = setUpload({ pendingFiles: [pendingFile(1), pendingFile(2)] });
    const user = userEvent.setup();
    const { container } = render(panel());

    expect(screen.getByText(/^2\/3/)).toBeInTheDocument();
    await user.upload(fileInput(container), images(3));

    expect(state.addFiles).toHaveBeenCalledTimes(1);
    const forwarded = vi.mocked(state.addFiles).mock.calls[0]![0] as File[];
    expect(forwarded.map((f) => f.name)).toEqual(["new-0.png"]);
    expect(toastMock.warning).toHaveBeenCalledWith("Up to 3 photos per note");
  });

  it("does not toast when the selection fits", async () => {
    const state = setUpload();
    const user = userEvent.setup();
    const { container } = render(panel());

    await user.upload(fileInput(container), images(3));
    expect(vi.mocked(state.addFiles).mock.calls[0]![0]).toHaveLength(3);
    expect(toastMock.warning).not.toHaveBeenCalled();
  });

  it("hides Add photos when full and removes a staged photo", async () => {
    const state = setUpload({
      pendingFiles: [pendingFile(1), pendingFile(2), pendingFile(3)],
    });
    const user = userEvent.setup();
    render(panel());

    expect(
      screen.queryByRole("button", { name: "Add photos" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove photo 2" }));
    expect(state.removeFile).toHaveBeenCalledWith("pending-2");
  });

  it("disables Add photos while files are being prepared", () => {
    setUpload({ isPreparing: true });
    render(panel());
    expect(screen.getByRole("button", { name: "Add photos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preparing…" })).toBeDisabled();
  });
});

describe("NotesPanel submit", () => {
  it("sends section scope + uploaded photo urls, then clears", async () => {
    const state = setUpload({
      pendingFiles: [pendingFile(1)],
      uploadAll: vi
        .fn()
        .mockResolvedValue([{ url: "https://s/editor-notes/a.png" }]),
    });
    trpcMocks.mutateAsync.mockResolvedValue({ id: "n1" });
    const user = userEvent.setup();
    const { rerender } = render(panel());
    rerender(panel({ id: "global.footer", nonce: 1 }));
    await waitFor(() => expect(sectionCombo()).toHaveTextContent("Footer"));

    await user.type(screen.getByLabelText("Note"), "Fix the phone number");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    await waitFor(() => expect(state.clear).toHaveBeenCalled());
    expect(trpcMocks.mutateAsync).toHaveBeenCalledWith({
      body: "Fix the phone number",
      pageKey: "homepage",
      pageLabel: "Homepage",
      sectionKey: "global.footer",
      sectionLabel: "Footer",
      attachmentUrls: ["https://s/editor-notes/a.png"],
    });
    expect(state.discard).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Note")).toHaveValue("");
  });

  it("discards uploaded photos when the note fails to send", async () => {
    const state = setUpload({
      pendingFiles: [pendingFile(1)],
      uploadAll: vi
        .fn()
        .mockResolvedValue([{ url: "https://s/editor-notes/a.png" }]),
    });
    trpcMocks.mutateAsync.mockRejectedValue(new Error("Slow down"));
    const user = userEvent.setup();
    render(panel());

    await user.type(screen.getByLabelText("Note"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send note" }));

    await waitFor(() =>
      expect(state.discard).toHaveBeenCalledWith([
        "https://s/editor-notes/a.png",
      ]),
    );
    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.error).toHaveBeenCalledWith("Slow down");
    expect(state.clear).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Note")).toHaveValue("Hello");
  });
});
