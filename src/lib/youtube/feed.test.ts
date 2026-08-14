import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseFeedXml } from "./feed";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

const channelXml = readFileSync(
  path.join(FIXTURES_DIR, "channel-feed.xml"),
  "utf8",
);
const playlistXml = readFileSync(
  path.join(FIXTURES_DIR, "playlist-feed.xml"),
  "utf8",
);

describe("parseFeedXml — real captured fixtures", () => {
  it("parses the channel fixture to exactly 15 entries", () => {
    expect(parseFeedXml(channelXml)).toHaveLength(15);
  });

  it("parses the playlist fixture to exactly 13 entries", () => {
    expect(parseFeedXml(playlistXml)).toHaveLength(13);
  });

  it("extracts youtubeId, title, thumbnailUrl, channelTitle, publishedAt for a known channel entry", () => {
    const entries = parseFeedXml(channelXml);
    const entry = entries.find((e) => e.youtubeId === "-rYFDefcq3k");
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      youtubeId: "-rYFDefcq3k",
      title: "Introducing Gemini Robotics 2",
      thumbnailUrl: "https://i2.ytimg.com/vi/-rYFDefcq3k/hqdefault.jpg",
      channelTitle: "Google for Developers",
    });
    expect(entry!.publishedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(entry!.publishedAt.getTime())).toBe(false);
    expect(entry!.publishedAt.toISOString()).toBe(
      new Date("2026-07-31T19:00:37+00:00").toISOString(),
    );
  });

  it("decodes entity-encoded titles to a literal & and preserves the curly quote", () => {
    const entries = parseFeedXml(playlistXml);
    const entry = entries.find((e) => e.youtubeId === "vN6uK5Qm23c");
    expect(entry).toBeDefined();
    expect(entry!.title).toBe("Serverless & AI/ML - Pittsburgh ML Summit ‘19");
    // Guard against the raw entity ever leaking through unescaped.
    expect(entry!.title).not.toContain("&amp;");
    expect(entry!.thumbnailUrl).toBe(
      "https://i3.ytimg.com/vi/vN6uK5Qm23c/hqdefault.jpg",
    );
    expect(entry!.channelTitle).toBe("Google for Developers");
  });

  it("sources channelTitle from the entry's author name, not the feed-level yt:channelId", () => {
    const entries = parseFeedXml(channelXml);
    // Verified fact: the feed-root <yt:channelId> is the UC-prefix-stripped
    // form ("_x5XG1OV2P6uZZ5FSM9Ttw"), not a valid channel/author name. Every
    // parsed entry's channelTitle must be the human-readable author name.
    expect(
      entries.every((e) => e.channelTitle === "Google for Developers"),
    ).toBe(true);
    expect(entries.some((e) => e.channelTitle?.includes("_x5XG1"))).toBe(false);
  });
});

describe("parseFeedXml — malformed / edge-case input", () => {
  it("returns [] for malformed XML without throwing", () => {
    expect(() => parseFeedXml("<<<not xml>>>garbage")).not.toThrow();
    expect(parseFeedXml("<<<not xml>>>garbage")).toEqual([]);
  });

  it("returns [] for an empty string without throwing", () => {
    expect(parseFeedXml("")).toEqual([]);
  });

  it("returns [] for a well-formed Atom feed with zero entries", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCempty00000000000000000"/>
 <id>yt:channel:empty00000000000000000</id>
 <yt:channelId>empty00000000000000000</yt:channelId>
 <title>Empty Channel</title>
 <author>
  <name>Empty Channel</name>
 </author>
</feed>`;
    expect(parseFeedXml(xml)).toEqual([]);
  });

  it("skips an entry missing yt:videoId while its siblings still parse", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Mixed Channel</title>
 <entry>
  <id>yt:video:missingIdEntry</id>
  <title>No video id here</title>
  <author><name>Some Channel</name></author>
  <published>2026-01-01T00:00:00+00:00</published>
  <media:group>
   <media:description>No id</media:description>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:goodVideoId</id>
  <yt:videoId>goodVideoId</yt:videoId>
  <yt:channelId>UCsomefakechannelid000000</yt:channelId>
  <title>Good entry</title>
  <author><name>Some Channel</name></author>
  <published>2026-01-02T00:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i1.ytimg.com/vi/goodVideoId/hqdefault.jpg" width="480" height="360"/>
   <media:description>Has an id</media:description>
  </media:group>
 </entry>
</feed>`;
    const entries = parseFeedXml(xml);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.youtubeId).toBe("goodVideoId");
    expect(entries[0]!.title).toBe("Good entry");
  });

  it("skips an entry with an unparseable published date while its siblings still parse", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Mixed Channel</title>
 <entry>
  <id>yt:video:dQw4w9WgXcQ</id>
  <yt:videoId>dQw4w9WgXcQ</yt:videoId>
  <title>Bad date</title>
  <author><name>Some Channel</name></author>
  <published>not-a-real-date</published>
 </entry>
 <entry>
  <id>yt:video:AbCdEfGhIjK</id>
  <yt:videoId>AbCdEfGhIjK</yt:videoId>
  <title>Good date</title>
  <author><name>Some Channel</name></author>
  <published>2026-01-03T00:00:00+00:00</published>
 </entry>
</feed>`;
    const entries = parseFeedXml(xml);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.youtubeId).toBe("AbCdEfGhIjK");
  });
});
