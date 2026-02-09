type Business = {
  name: string;
  siteContent: {
    footerText: string | null;
  } | null;
};

type StorefrontFooterProps = {
  business: Business;
};

export function StorefrontFooter({ business }: StorefrontFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-gray-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-bold">{business.name}</h3>
            {business.siteContent?.footerText && (
              <p className="text-sm text-gray-400">
                {business.siteContent.footerText}
              </p>
            )}
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a
                  href="/products"
                  className="transition-colors hover:text-white"
                >
                  All Products
                </a>
              </li>
              <li>
                <a href="/about" className="transition-colors hover:text-white">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a
                  href="/contact"
                  className="transition-colors hover:text-white"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="/shipping"
                  className="transition-colors hover:text-white"
                >
                  Shipping Info
                </a>
              </li>
              <li>
                <a
                  href="/returns"
                  className="transition-colors hover:text-white"
                >
                  Returns
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>
            © {currentYear} {business.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
