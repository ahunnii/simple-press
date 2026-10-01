import { beforeEach, describe, expect, it, vi } from "vitest";

import { editorNoteAttachmentPrefix } from "~/lib/s3/url";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createEditorNote,
  createOwnerUser,
} from "../helpers/factories";

/**
 * Coverage for `src/server/api/routers/editor-note.ts` — section scope and
 * photo attachments on `create`, and the new fields on `listMine`.
 *
 * Tenant resolution in `ownerAdminProcedure` reads the request host via
 * `next/headers`, mocked with a mutable host (same idiom as
 * `loyalty-router.test.ts`). Discord is mocked so no webhook is ever hit.
 */
const reqHost = vi.hoisted(() => ({ value: "note-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const discordMocks = vi.hoisted(() => ({
  notifyDiscordEditorNote: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/lib/discord/notification", () => ({
  notifyDiscordEditorNote: (...args: unknown[]): unknown =>
    discordMocks.notifyDiscordEditorNote(...args),
}));

async function setupBusiness() {
  const business = await createBusiness();
  reqHost.value = `${business.subdomain}.simplepress.test`;
  const owner = await createOwnerUser(business.id);
  const caller = createTestCaller({ userId: owner.id, email: owner.email });
  return { business, owner, caller };
}

/** A URL shaped exactly like the `editorNoteImages` upload route's output. */
const noteImage = (businessId: string, hex: string, ext = ".jpg") =>
  `${editorNoteAttachmentPrefix(businessId)}${hex}${ext}`;

describe("editorNote router", () => {
  beforeEach(async () => {
    await resetDb();
    discordMocks.notifyDiscordEditorNote.mockClear();
  });

  it("create persists a section scope and 3 valid attachments, and forwards them to Discord", async () => {
    const { business, caller } = await setupBusiness();
    const urls = [
      noteImage(business.id, "0123456789abcdef"),
      noteImage(business.id, "fedcba9876543210", ".png"),
      noteImage(business.id, "aaaaaaaaaaaaaaaa", ".webp"),
    ];

    const note = await caller.editorNote.create({
      body: "Make the hero taller",
      pageKey: "homepage",
      pageLabel: "Homepage",
      sectionKey: "homepage.hero",
      sectionLabel: "Hero",
      attachmentUrls: urls,
    });

    const row = await db.editorNote.findUniqueOrThrow({
      where: { id: note.id },
    });
    expect(row).toMatchObject({
      businessId: business.id,
      pageKey: "homepage",
      pageLabel: "Homepage",
      sectionKey: "homepage.hero",
      sectionLabel: "Hero",
      attachmentUrls: urls,
    });
    expect(discordMocks.notifyDiscordEditorNote).toHaveBeenCalledWith(
      expect.objectContaining({
        pageLabel: "Homepage",
        sectionLabel: "Hero",
        attachmentUrls: urls,
      }),
    );
  });

  it("create without the new fields still works (whole-site note)", async () => {
    const { caller } = await setupBusiness();

    const note = await caller.editorNote.create({
      body: "General feedback",
      pageKey: null,
      pageLabel: null,
    });

    expect(note.sectionKey).toBeNull();
    expect(note.sectionLabel).toBeNull();
    expect(note.attachmentUrls).toEqual([]);
  });

  it("create dedupes repeated attachment URLs", async () => {
    const { business, caller } = await setupBusiness();
    const url = noteImage(business.id, "0123456789abcdef");

    const note = await caller.editorNote.create({
      body: "Dupes",
      pageKey: null,
      pageLabel: null,
      attachmentUrls: [url, url],
    });

    expect(note.attachmentUrls).toEqual([url]);
  });

  it("create rejects a 4th attachment", async () => {
    const { business, caller } = await setupBusiness();
    const urls = [
      "0000000000000001",
      "0000000000000002",
      "0000000000000003",
      "0000000000000004",
    ].map((hex) => noteImage(business.id, hex));

    await expect(
      caller.editorNote.create({
        body: "Too many",
        pageKey: null,
        pageLabel: null,
        attachmentUrls: urls,
      }),
    ).rejects.toThrow();
    expect(await db.editorNote.count()).toBe(0);
  });

  it("create rejects attachment URLs outside this business's editor-notes prefix", async () => {
    const { business, caller } = await setupBusiness();
    const other = await createBusiness();

    const bad = [
      // arbitrary external URL
      "https://evil.example.com/editor-notes/0123456789abcdef.jpg",
      // right business, wrong folder (e.g. a product image)
      `${editorNoteAttachmentPrefix(business.id).replace("editor-notes/", "")}image-0123456789abcdef.jpg`,
      // another business's editor-notes/
      noteImage(other.id, "0123456789abcdef"),
      // prefix trick: traversal out of the folder
      `${editorNoteAttachmentPrefix(business.id)}../../${other.id}/image-abc.jpg`,
    ];

    for (const url of bad) {
      await expect(
        caller.editorNote.create({
          body: "Bad attachment",
          pageKey: null,
          pageLabel: null,
          attachmentUrls: [url],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(await db.editorNote.count()).toBe(0);
  });

  it("create rejects a sectionKey without a pageKey", async () => {
    const { caller } = await setupBusiness();

    await expect(
      caller.editorNote.create({
        body: "Orphan section",
        pageKey: null,
        pageLabel: null,
        sectionKey: "homepage.hero",
        sectionLabel: "Hero",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await db.editorNote.count()).toBe(0);
  });

  it("listMine returns the section and attachment fields, scoped to the caller's business", async () => {
    const { business, owner, caller } = await setupBusiness();
    const other = await createBusiness();
    const urls = [noteImage(business.id, "0123456789abcdef")];

    await createEditorNote(business.id, {
      body: "Mine",
      pageKey: "homepage",
      pageLabel: "Homepage",
      sectionKey: "global.header",
      sectionLabel: "Header",
      attachmentUrls: urls,
      createdByUserId: owner.id,
    });
    await createEditorNote(other.id, { body: "Not mine" });

    const notes = await caller.editorNote.listMine();

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      body: "Mine",
      pageKey: "homepage",
      pageLabel: "Homepage",
      sectionKey: "global.header",
      sectionLabel: "Header",
      attachmentUrls: urls,
    });
  });
});
