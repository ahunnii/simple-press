import { describe, expect, it } from "vitest";

import {
  parseChannelRef,
  parsePlaylistId,
  parseSourceInput,
  parseYouTubeVideoId,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from "./parse";

const VALID_ID = "dQw4w9WgXcQ"; // 11 chars, real-shaped
const VALID_CHANNEL_ID = "UCuAXFkgsw1L7xaCfnd5JJOw"; // "UC" + 22 chars = 24

describe("parseYouTubeVideoId", () => {
  it("parses youtube.com/watch?v=ID", () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`),
    ).toBe(VALID_ID);
  });

  it("parses watch URLs on any subdomain", () => {
    expect(
      parseYouTubeVideoId(`https://m.youtube.com/watch?v=${VALID_ID}`),
    ).toBe(VALID_ID);
    expect(parseYouTubeVideoId(`https://youtube.com/watch?v=${VALID_ID}`)).toBe(
      VALID_ID,
    );
  });

  it("strips extra query params: ?t=, &list=, si=", () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}&t=90`),
    ).toBe(VALID_ID);
    expect(
      parseYouTubeVideoId(
        `https://www.youtube.com/watch?v=${VALID_ID}&list=PLabcdefghijklmno`,
      ),
    ).toBe(VALID_ID);
    expect(
      parseYouTubeVideoId(
        `https://www.youtube.com/watch?v=${VALID_ID}&si=xyz123`,
      ),
    ).toBe(VALID_ID);
    expect(
      parseYouTubeVideoId(
        `https://www.youtube.com/watch?si=xyz123&v=${VALID_ID}&t=90&list=PLabcdefghijklmno`,
      ),
    ).toBe(VALID_ID);
  });

  it("parses youtu.be/ID", () => {
    expect(parseYouTubeVideoId(`https://youtu.be/${VALID_ID}`)).toBe(VALID_ID);
  });

  it("parses youtu.be/ID?t=30", () => {
    expect(parseYouTubeVideoId(`https://youtu.be/${VALID_ID}?t=30`)).toBe(
      VALID_ID,
    );
  });

  it("parses youtube.com/shorts/ID", () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/shorts/${VALID_ID}`),
    ).toBe(VALID_ID);
  });

  it("parses youtube.com/embed/ID", () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/embed/${VALID_ID}`),
    ).toBe(VALID_ID);
  });

  it("parses youtube-nocookie.com/embed/ID", () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${VALID_ID}`),
    ).toBe(VALID_ID);
  });

  it("parses youtube.com/live/ID", () => {
    expect(
      parseYouTubeVideoId(`https://www.youtube.com/live/${VALID_ID}`),
    ).toBe(VALID_ID);
  });

  it("rejects lookalike hosts", () => {
    expect(
      parseYouTubeVideoId(`https://evilyoutube.com/watch?v=${VALID_ID}`),
    ).toBeNull();
    expect(
      parseYouTubeVideoId(`https://youtube.com.evil.com/watch?v=${VALID_ID}`),
    ).toBeNull();
    expect(parseYouTubeVideoId(`https://notyoutu.be/${VALID_ID}`)).toBeNull();
  });

  it("rejects malformed video IDs", () => {
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=short"),
    ).toBeNull();
    expect(
      parseYouTubeVideoId(
        "https://www.youtube.com/watch?v=wayTooLongToBeAVideoId",
      ),
    ).toBeNull();
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=bad!char$$"),
    ).toBeNull();
    expect(parseYouTubeVideoId(`https://youtu.be/short`)).toBeNull();
  });

  it("returns null for non-URL garbage, empty string, and unsafe schemes without throwing", () => {
    expect(() => parseYouTubeVideoId("not a url at all")).not.toThrow();
    expect(parseYouTubeVideoId("not a url at all")).toBeNull();
    expect(parseYouTubeVideoId("")).toBeNull();
    expect(parseYouTubeVideoId("javascript:alert(1)")).toBeNull();
    expect(
      parseYouTubeVideoId("data:text/html,<script>alert(1)</script>"),
    ).toBeNull();
  });

  it("returns null for a watch URL with no v param, and other unmatched paths", () => {
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?list=PLabc"),
    ).toBeNull();
    expect(parseYouTubeVideoId("https://www.youtube.com/")).toBeNull();
    expect(
      parseYouTubeVideoId("https://www.youtube.com/results?search_query=x"),
    ).toBeNull();
  });
});

describe("parsePlaylistId", () => {
  it("parses from a /playlist?list= URL", () => {
    expect(
      parsePlaylistId(
        "https://www.youtube.com/playlist?list=PLabcdefghijklmno",
      ),
    ).toBe("PLabcdefghijklmno");
  });

  it("parses from a watch URL carrying a list param", () => {
    expect(
      parsePlaylistId(
        `https://www.youtube.com/watch?v=${VALID_ID}&list=PLabcdefghijklmno`,
      ),
    ).toBe("PLabcdefghijklmno");
  });

  it("returns null when there is no list param", () => {
    expect(
      parsePlaylistId(`https://www.youtube.com/watch?v=${VALID_ID}`),
    ).toBeNull();
  });

  it("returns null for youtu.be and lookalike hosts", () => {
    expect(
      parsePlaylistId("https://youtu.be/abc?list=PLabcdefghijklmno"),
    ).toBeNull();
    expect(
      parsePlaylistId(
        "https://evilyoutube.com/playlist?list=PLabcdefghijklmno",
      ),
    ).toBeNull();
  });

  it("returns null for garbage input without throwing", () => {
    expect(() => parsePlaylistId("not a url")).not.toThrow();
    expect(parsePlaylistId("not a url")).toBeNull();
    expect(parsePlaylistId("")).toBeNull();
  });
});

describe("parseChannelRef", () => {
  it("parses youtube.com/channel/UC…", () => {
    expect(
      parseChannelRef(`https://www.youtube.com/channel/${VALID_CHANNEL_ID}`),
    ).toEqual({ kind: "channel", externalId: VALID_CHANNEL_ID });
  });

  it("parses youtube.com/@SomeHandle, stripping the @", () => {
    expect(parseChannelRef("https://www.youtube.com/@SomeHandle")).toEqual({
      kind: "handle",
      handle: "SomeHandle",
    });
  });

  it("parses legacy youtube.com/c/Name", () => {
    expect(parseChannelRef("https://www.youtube.com/c/SomeName")).toEqual({
      kind: "handle",
      handle: "SomeName",
    });
  });

  it("parses legacy youtube.com/user/Name", () => {
    expect(parseChannelRef("https://www.youtube.com/user/SomeName")).toEqual({
      kind: "handle",
      handle: "SomeName",
    });
  });

  it("parses a bare UC… channel ID", () => {
    expect(parseChannelRef(VALID_CHANNEL_ID)).toEqual({
      kind: "channel",
      externalId: VALID_CHANNEL_ID,
    });
  });

  it("rejects a malformed /channel/ id", () => {
    expect(
      parseChannelRef("https://www.youtube.com/channel/notachannelid"),
    ).toBeNull();
  });

  it("rejects lookalike hosts", () => {
    expect(
      parseChannelRef(`https://evilyoutube.com/channel/${VALID_CHANNEL_ID}`),
    ).toBeNull();
  });

  it("returns null for garbage input without throwing", () => {
    expect(() => parseChannelRef("not a url")).not.toThrow();
    expect(parseChannelRef("not a url")).toBeNull();
    expect(parseChannelRef("")).toBeNull();
    expect(parseChannelRef("javascript:alert(1)")).toBeNull();
  });
});

describe("parseSourceInput", () => {
  it("parses a playlist URL", () => {
    expect(
      parseSourceInput(
        "https://www.youtube.com/playlist?list=PLabcdefghijklmno",
      ),
    ).toEqual({ kind: "playlist", externalId: "PLabcdefghijklmno" });
  });

  it("parses a bare PL… playlist id", () => {
    expect(parseSourceInput("PLabcdefghijklmno")).toEqual({
      kind: "playlist",
      externalId: "PLabcdefghijklmno",
    });
  });

  it("parses a bare UU… uploads-playlist id", () => {
    expect(parseSourceInput("UUabcdefghijklmno")).toEqual({
      kind: "playlist",
      externalId: "UUabcdefghijklmno",
    });
  });

  it("falls back to a channel ref for a channel URL", () => {
    expect(
      parseSourceInput(`https://www.youtube.com/channel/${VALID_CHANNEL_ID}`),
    ).toEqual({ kind: "channel", externalId: VALID_CHANNEL_ID });
  });

  it("falls back to a channel ref for a handle URL", () => {
    expect(parseSourceInput("https://www.youtube.com/@SomeHandle")).toEqual({
      kind: "handle",
      handle: "SomeHandle",
    });
  });

  it("falls back to a bare channel id", () => {
    expect(parseSourceInput(VALID_CHANNEL_ID)).toEqual({
      kind: "channel",
      externalId: VALID_CHANNEL_ID,
    });
  });

  it("returns null for garbage input without throwing", () => {
    expect(() => parseSourceInput("not a url")).not.toThrow();
    expect(parseSourceInput("not a url")).toBeNull();
    expect(parseSourceInput("")).toBeNull();
  });
});

describe("youtubeWatchUrl / youtubeEmbedUrl", () => {
  it("builds a canonical watch URL", () => {
    expect(youtubeWatchUrl(VALID_ID)).toBe(
      `https://www.youtube.com/watch?v=${VALID_ID}`,
    );
  });

  it("builds a privacy-enhanced nocookie embed URL", () => {
    expect(youtubeEmbedUrl(VALID_ID)).toBe(
      `https://www.youtube-nocookie.com/embed/${VALID_ID}`,
    );
  });
});
