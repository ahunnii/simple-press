import "./test-env";
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `next/font/google` is a build-time construct the Next compiler replaces; under
// vitest the module resolves to an object whose font functions don't exist, so
// any component that transitively imports a template's font scope throws
// "Syne is not a function" at import time. Return the same shape next/font does
// (className + variable + style) for any font requested.
// Vitest validates named exports against the returned object, so each font has
// to be listed explicitly. Keep in sync with:
//   grep -rhoP 'import \{[^}]+\} from "next/font/google"' src/
vi.mock("next/font/google", () => {
  const font = (name: string) => () => ({
    className: `mock-font-${name}`,
    variable: `--mock-font-${name}`,
    style: { fontFamily: name },
  });
  return Object.fromEntries(
    [
      "Agdasima",
      "Amatic_SC",
      "Cormorant_Garamond",
      "DM_Sans",
      "Fraunces",
      "Geist",
      "Inter",
      "JetBrains_Mono",
      "Jost",
      "Manrope",
      "Nunito_Sans",
      "Outfit",
      "Playfair_Display",
      "Plus_Jakarta_Sans",
      "Poppins",
      "Raleway",
      "Spectral",
    ].map((n) => [n, font(n)]),
  );
});

// happy-dom + Node can leave the global `localStorage` without working methods.
// Install a single in-memory Storage shared by `globalThis` and `window` so both
// the component (bare `localStorage`) and tests use the same instance.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
  writable: true,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

// Radix UI primitives reference browser APIs happy-dom doesn't implement.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  storage.clear();
});
