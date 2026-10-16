import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentPicker } from "./document-picker";

type ListResult = {
  data?: { items: unknown[] };
  isLoading: boolean;
  isError: boolean;
};

const mocks = vi.hoisted(() => ({
  shopList: vi.fn<() => ListResult>(),
  upload: vi.fn(),
}));

// The real tRPC client transitively imports server-only Prisma setup.
vi.mock("~/trpc/react", () => ({
  api: {
    media: { list: { useQuery: () => mocks.shopList() } },
    platformMedia: {
      list: {
        useQuery: () => ({ data: undefined, isLoading: false, isError: false }),
      },
    },
  },
}));
vi.mock("~/hooks/use-document-upload", () => ({
  useDocumentUpload: () => ({ upload: mocks.upload, isPending: false }),
}));

const BASE = "https://storage.example.com/bucket/";

function item(key: string, kind: string, day: number) {
  return {
    key,
    url: `${BASE}${key}`,
    size: 2048,
    lastModified: new Date(Date.UTC(2026, 9, day)),
    kind,
    usedBy: [],
  };
}

function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: /Link to a file/ }));
}

beforeEach(() => {
  mocks.shopList.mockReset();
  mocks.upload.mockReset();
});

describe("DocumentPicker", () => {
  it("lists only PDFs, newest first, and picks one by URL", () => {
    mocks.shopList.mockReturnValue({
      data: {
        items: [
          item("biz/library-doc-aa11-old-report.pdf", "document", 1),
          item("biz/image-bb22.png", "image", 5),
          item("biz/library-doc-cc33-annual-report.pdf", "document", 9),
        ],
      },
      isLoading: false,
      isError: false,
    });
    const onSelect = vi.fn();
    render(<DocumentPicker inline onSelect={onSelect} />);
    openPicker();

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("annual-report.pdf"),
      expect.stringContaining("old-report.pdf"),
    ]);

    fireEvent.click(options[0]!);
    expect(onSelect).toHaveBeenCalledWith(
      `${BASE}biz/library-doc-cc33-annual-report.pdf`,
      {
        name: "annual-report.pdf",
        key: "biz/library-doc-cc33-annual-report.pdf",
      },
    );
  });

  it("shows the empty state when there are no PDFs", () => {
    mocks.shopList.mockReturnValue({
      data: { items: [item("biz/image-bb22.png", "image", 5)] },
      isLoading: false,
      isError: false,
    });
    render(<DocumentPicker inline onSelect={vi.fn()} />);
    openPicker();
    expect(screen.getByText("No PDFs yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upload a PDF/ }),
    ).toBeInTheDocument();
  });

  it("falls back to upload-only when the list errors", () => {
    mocks.shopList.mockReturnValue({ isLoading: false, isError: true });
    render(<DocumentPicker inline onSelect={vi.fn()} />);
    openPicker();
    expect(screen.getByText("Upload a PDF to link to it.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search PDFs…")).toBeNull();
  });

  it("picks the PDF it just uploaded", async () => {
    mocks.shopList.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
    });
    mocks.upload.mockResolvedValue([
      {
        key: "biz/library-doc-dd44-menu.pdf",
        url: `${BASE}biz/library-doc-dd44-menu.pdf`,
        name: "Menu.pdf",
      },
    ]);
    const onSelect = vi.fn();
    const { container } = render(<DocumentPicker inline onSelect={onSelect} />);
    openPicker();

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["%PDF-1.7"], "Menu.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(
        `${BASE}biz/library-doc-dd44-menu.pdf`,
        { name: "Menu.pdf", key: "biz/library-doc-dd44-menu.pdf" },
      ),
    );
    expect(mocks.upload).toHaveBeenCalledWith([file]);
  });
});
