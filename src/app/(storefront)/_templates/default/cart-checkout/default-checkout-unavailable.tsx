export function DefaultCheckoutUnavailable() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-[#0a0a0a] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="border-b border-[#e8e8e8] px-6 py-4">
        <span className="text-sm font-medium">Checkout</span>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center p-4"
      >
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Checkout Unavailable
          </h1>
          <p className="text-gray-600">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
        </div>
      </main>
    </div>
  );
}
