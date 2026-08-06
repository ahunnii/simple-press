import { describe, expect, it } from "vitest";

import { resolveOwnAvatarKey } from "./avatar-key";
import { keyToPublicUrl } from "./url";

const USER = "user_abc123";
const OTHER = "user_zzz999";

describe("resolveOwnAvatarKey", () => {
  it("accepts the caller's own avatar", () => {
    const url = keyToPublicUrl(`avatars/${USER}.webp`);
    expect(resolveOwnAvatarKey(url, USER)).toBe(`avatars/${USER}.webp`);
  });

  it("accepts it with the cache-busting query uploads append", () => {
    const url = `${keyToPublicUrl(`avatars/${USER}.webp`)}?v=1754300000000`;
    expect(resolveOwnAvatarKey(url, USER)).toBe(`avatars/${USER}.webp`);
  });

  it("ignores a fragment", () => {
    const url = `${keyToPublicUrl(`avatars/${USER}.png`)}#x`;
    expect(resolveOwnAvatarKey(url, USER)).toBe(`avatars/${USER}.png`);
  });

  // The security boundary: the URL is caller-supplied, so without these checks
  // account.deleteAvatar would delete arbitrary bucket objects.
  it("refuses another user's avatar", () => {
    const url = keyToPublicUrl(`avatars/${OTHER}.webp`);
    expect(resolveOwnAvatarKey(url, USER)).toBe(null);
  });

  it("refuses non-avatar objects", () => {
    expect(resolveOwnAvatarKey(keyToPublicUrl("biz_1/logo.png"), USER)).toBe(
      null,
    );
    expect(
      resolveOwnAvatarKey(keyToPublicUrl("biz_1/image-abc.png"), USER),
    ).toBe(null);
  });

  it("refuses URLs outside our storage bucket", () => {
    expect(
      resolveOwnAvatarKey(`https://evil.test/avatars/${USER}.webp`, USER),
    ).toBe(null);
  });

  it("refuses a prefix-collision on the user id", () => {
    // `user_abc123extra` must not satisfy a check for `user_abc123`.
    const url = keyToPublicUrl(`avatars/${USER}extra.webp`);
    expect(resolveOwnAvatarKey(url, USER)).toBe(null);
  });

  it("refuses traversal or nested keys under the caller's prefix", () => {
    expect(
      resolveOwnAvatarKey(keyToPublicUrl(`avatars/${USER}./../secret`), USER),
    ).toBe(null);
    expect(
      resolveOwnAvatarKey(keyToPublicUrl(`avatars/${USER}.webp/extra`), USER),
    ).toBe(null);
  });

  it("refuses an empty extension", () => {
    expect(resolveOwnAvatarKey(keyToPublicUrl(`avatars/${USER}.`), USER)).toBe(
      null,
    );
  });

  it("refuses empty input", () => {
    expect(resolveOwnAvatarKey("", USER)).toBe(null);
    expect(resolveOwnAvatarKey(keyToPublicUrl(`avatars/${USER}.webp`), "")).toBe(
      null,
    );
  });
});
