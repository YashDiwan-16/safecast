import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const flowLinks = [
  { to: "/before", label: "Readiness" },
  { to: "/bro", label: "/bro" },
  { to: "/after", label: "Recovery" },
] as const;

const dataSourceLinks = [
  { href: "https://open-meteo.com", label: "Open-Meteo" },
  { href: "https://www.openstreetmap.org", label: "OpenStreetMap / Nominatim" },
  { href: "https://project-osrm.org", label: "OSRM" },
  { href: "https://overpass-api.de", label: "Overpass API" },
  { href: "https://www.gdeltproject.org", label: "GDELT" },
] as const;

const projectLinks = [
  { href: "https://github.com/YashDiwan-16/safecast", label: "GitHub" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md border border-border bg-card">
              <ShieldCheck className="size-4 text-sky-400" />
            </span>
            <span className="font-semibold tracking-tight">SafeCast AI</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Multilingual monsoon safety intelligence for before, during, and after severe weather.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            We show unavailable states instead of fake alerts.
          </p>
        </div>

        <FooterColumn title="Flows">
          {flowLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Live data sources">
          {dataSourceLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Project">
          {projectLinks.map((link) =>
            "href" in link ? (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ) : (
              <li key={link.to}>
                <Link to={link.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ),
          )}
        </FooterColumn>
      </div>

      <div className="border-t border-border/60 px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SafeCast AI</span>
          <span>Not a substitute for official emergency services.</span>
        </div>
      </div>
    </footer>
  );
}
