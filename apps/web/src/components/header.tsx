import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const navLinks = [
  { to: "/before", label: "Readiness" },
  { to: "/bro", label: "/bro", mono: true },
  { to: "/after", label: "Recovery" },
] as const;

function NavLink({
  to,
  label,
  mono,
  active,
  onClick,
}: {
  to: string;
  label: string;
  mono?: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative py-1 text-sm font-medium transition-colors ${
        active ? (mono ? "text-sky-400" : "text-foreground") : mono ? "text-sky-500/80 hover:text-sky-400" : "text-muted-foreground hover:text-foreground"
      } ${mono ? "font-mono" : ""}`}
    >
      {label}
      {active ? <span className="absolute -bottom-[5px] left-0 right-0 h-0.5 rounded-full bg-sky-400" /> : null}
    </Link>
  );
}

export default function Header() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md border border-border bg-card">
            <ShieldCheck className="size-4 text-sky-400" />
          </span>
          <span className="font-semibold tracking-tight">SafeCast</span>
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            AI
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} label={link.label} mono={link.mono} active={pathname === link.to} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex md:items-center md:gap-2">
            <ModeToggle />
            <UserMenu />
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>SafeCast AI</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-4 px-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    label={link.label}
                    mono={link.mono}
                    active={pathname === link.to}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </nav>
              <div className="mt-6 flex items-center gap-2 px-1">
                <ModeToggle />
                <UserMenu />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
