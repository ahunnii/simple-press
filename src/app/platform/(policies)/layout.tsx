"use client";

import { PlatformHeader } from "~/app/_components/platform-specific/platform-header";

export default function PoliciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <PlatformHeader />
      <main>{children}</main>
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} SimplePress. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
