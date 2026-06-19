// Stub for `server-only` (and similar import guards) under Vitest. The real
// package throws unless resolved with the `react-server` condition; in tests we
// no-op the guard so server modules can be imported into the node test runtime.
export {};
