import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const legalLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Content Policy", href: "/content-policy" },
  { label: "Cookies", href: "/cookies" },
  { label: "Copyright", href: "/copyright" },
  { label: "Contact", href: "/contact" },
];

const otherLinks = [
  { label: "Help", href: "/help" },
  { label: "Status", href: "/status" },
  { label: "Report Bug", href: "/report-bug" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-warm">
              <span className="text-sm font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Whistle. All rights reserved.
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Separator orientation="vertical" className="h-4 hidden md:block" />
            {otherLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
