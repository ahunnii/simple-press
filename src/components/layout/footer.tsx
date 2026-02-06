import { Facebook, Instagram, Mail, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  community: [
    { label: "About Us", href: "/about" },
    { label: "Events Calendar", href: "/events" },
    { label: "Our Mission", href: "/about#mission" },
    { label: "Leadership", href: "/about#leadership" },
    { label: "Partners", href: "/about#partners" },
  ],
  activities: [
    // { label: "Events Calendar", href: "/events" },
    // { label: "Workshops", href: "#" },
    // { label: "Volunteer", href: "#" },
    // { label: "Programs", href: "#" },
  ],
  resources: [
    // { label: "FAQs", href: "#" },
    { label: "Contact Us", href: "/contact" },
    { label: "Newsletter", href: "/newsletters" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Mail, href: "#", label: "Email" },
];

export function Footer() {
  return (
    <footer className="bg-card border-border border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-3">
            <Link href="/" className="mb-4 flex items-center gap-2">
              {/* <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
                <span className="text-primary-foreground text-sm font-bold">
                  CCA
                </span>
              </div>
              <span className="text-foreground text-lg font-semibold">
                Crossroads Community Association
              </span> */}
              <Image
                src="/logo-transparent.png"
                alt="Crossroads Community Association"
                width={100}
                height={100}
              />
            </Link>
            <p className="text-muted-foreground mb-6 max-w-xs text-sm leading-relaxed">
              Building stronger connections and enriching lives through
              community engagement since 2026.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold">
              Community
            </h4>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold">
              Activities
            </h4>
            <ul className="space-y-3">
              {footerLinks.activities.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-border mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-muted-foreground text-sm">
            © 2026 Crossroads Community Association. All rights reserved.
            <span className="text-muted-foreground mx-2">|</span>
            Site by{" "}
            <a
              href="https://artisanalfutures.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline"
            >
              Artisanal Futures
            </a>
          </p>
          <div className="text-muted-foreground flex gap-6 text-sm">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
