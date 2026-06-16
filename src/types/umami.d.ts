/**
 * Global type declaration for the Umami analytics tracker injected by the
 * Umami script tag. May be absent when:
 * - NEXT_PUBLIC_ENABLE_UMAMI is false
 * - The script is blocked by an ad-blocker
 * - The business hasn't enabled Umami
 *
 * All code that accesses window.umami MUST guard with `window.umami?.track(...)`.
 */

export {};

declare global {
  interface Window {
    umami?: {
      track: (
        event: string,
        data?: Record<string, unknown>,
      ) => void;
    };
  }
}
