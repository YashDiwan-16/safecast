import { Link } from "@tanstack/react-router";
import { ClipboardList, Home, Map, Radar, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSafeCastContext } from "@/hooks/use-safecast-context";

import { EmergencyProfileDialog } from "./emergency-profile-dialog";

const languages = ["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];

const entryCards = [
  {
    title: "Readiness",
    description: "Prepare household supplies, evacuation thresholds, documents, and watch points.",
    to: "/before",
    icon: ClipboardList,
    badge: "Preparedness engine",
  },
  {
    title: "/bro",
    description: "Get immediate situation-aware safety guidance during flooding or severe rainfall.",
    to: "/bro",
    icon: ShieldAlert,
    badge: "Live advisor",
  },
  {
    title: "Recovery",
    description: "Plan safe re-entry, cleanup, documentation, sanitation, and recovery steps.",
    to: "/after",
    icon: Home,
    badge: "Recovery assistant",
  },
] as const;

const trustStrip = [
  ["Weather", "Open-Meteo forecast and current conditions"],
  ["Maps", "OpenStreetMap/Nominatim location intelligence"],
  ["AI", "Gemini reasoning with live-data tools"],
  ["Integrity", "Unavailable states instead of fabricated alerts"],
] as const;

export function HomePage() {
  const { location, setLocation, language, setLanguage } = useSafeCastContext();

  return (
    <main className="bg-background">
      <section className="bg-grid-fade border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Radar className="size-3" />
              Real weather
            </Badge>
            <Badge variant="outline">
              <Map className="size-3" />
              Real map intelligence
            </Badge>
            <Badge variant="outline">
              <Sparkles className="size-3" />
              Real AI reasoning
            </Badge>
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Multilingual monsoon safety intelligence, before, during, and after severe weather.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            A civic safety command surface for households and responders: live weather, live map context, grounded
            AI reasoning, multilingual support, and no fake alerts.
          </p>

          <Card className="mt-10 max-w-3xl">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="home-location">Location</Label>
                <Input
                  id="home-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City, district, neighborhood, or address"
                />
              </div>
              <div className="grid gap-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger aria-label="Language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <EmergencyProfileDialog />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="size-5 text-sky-400" />
          <h2 className="text-xl font-semibold tracking-tight">Choose your situation</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {entryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.to} to={card.to} className="group block focus:outline-none">
                <Card className="h-full transition-colors hover:border-sky-500/60 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring">
                  <CardHeader>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="grid size-10 place-items-center rounded-lg border border-border bg-background">
                        <Icon className="size-5 text-sky-400" />
                      </div>
                      <Badge variant="outline">{card.badge}</Badge>
                    </div>
                    <CardTitle className={card.title === "/bro" ? "font-mono text-sky-400" : undefined}>
                      {card.title}
                    </CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex h-10 w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-sky-400">
                      Open working flow
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          {trustStrip.map(([title, text]) => (
            <div key={title} className="rounded-lg border border-border p-3">
              <div className="font-medium text-foreground">{title}</div>
              <div className="mt-1">{text}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
