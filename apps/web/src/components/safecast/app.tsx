import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BellRing,
  ClipboardList,
  Home,
  Info,
  Map,
  MessageCircle,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getJson } from "@/lib/api";
import type { LiveSafetyContext } from "@/lib/safecast-types";

import { EngineTabs } from "./engine-tabs";
import { LiveDataPanel } from "./live-data-panel";
import { SafeCastBot, SafeCastBotAvatar } from "./safe-cast-bot";

const languages = ["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];

const entryCards = [
  {
    title: "Before Monsoon",
    description: "Prepare household supplies, evacuation thresholds, documents, and watch points.",
    to: "/before",
    icon: ClipboardList,
    badge: "Preparedness engine",
  },
  {
    title: "During Monsoon /bro",
    description: "Get immediate situation-aware safety guidance during flooding or severe rainfall.",
    to: "/bro",
    icon: ShieldAlert,
    badge: "Live advisor",
  },
  {
    title: "After Monsoon",
    description: "Plan safe re-entry, cleanup, documentation, sanitation, and recovery steps.",
    to: "/after",
    icon: Home,
    badge: "Recovery assistant",
  },
] as const;

function EmergencyProfileDialog() {
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState("");
  const [needs, setNeeds] = useState("");
  const [saved, setSaved] = useState(false);

  function saveProfile() {
    window.localStorage.setItem(
      "safecast-emergency-profile",
      JSON.stringify({ name, contacts, needs, savedAt: new Date().toISOString() }),
    );
    setSaved(true);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BellRing className="size-4" />
          Emergency profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emergency Profile Setup</DialogTitle>
          <DialogDescription>
            Store household context locally in this browser so you can reference it while using SafeCast AI.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Household or contact name</Label>
            <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-contacts">Emergency contacts</Label>
            <Input
              id="profile-contacts"
              value={contacts}
              onChange={(event) => setContacts(event.target.value)}
              placeholder="Names and phone numbers"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-needs">Access, medicine, mobility, pets, or other needs</Label>
            <Input id="profile-needs" value={needs} onChange={(event) => setNeeds(event.target.value)} />
          </div>
          {saved ? (
            <Alert>
              <AlertTitle>Profile saved locally</AlertTitle>
              <AlertDescription>No emergency profile data was sent to a server.</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
            <Button onClick={saveProfile}>Save profile</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompactAssistant({
  location,
  language,
  mode,
}: {
  location: string;
  language: string;
  mode: string;
}) {
  const requestBody = useMemo(() => ({ location, language, mode }), [language, location, mode]);

  return (
    <Sheet>
      <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border bg-background p-2 shadow-lg">
        <SheetTrigger asChild>
          <button
            type="button"
            className="rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Open SafeCast AI assistant"
          >
            <SafeCastBotAvatar state="idle" size="sm" />
          </button>
        </SheetTrigger>
        <div className="hidden min-w-0 sm:block">
          <div className="text-sm font-medium">SafeCast assistant</div>
          <div className="truncate text-xs text-muted-foreground">Open live AI guidance</div>
        </div>
        <SheetTrigger asChild>
          <Button type="button" size="icon" aria-label="Open assistant panel">
            <MessageCircle className="size-4" />
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent className="w-full max-w-md overflow-y-auto sm:w-[28rem]">
        <SheetHeader className="mb-4">
          <SheetTitle>SafeCast AI Assistant</SheetTitle>
          <SheetDescription>Streaming safety chat with live weather, map, and public-update tools.</SheetDescription>
        </SheetHeader>
        <SafeCastBot
          api="/chat"
          requestBody={requestBody}
          title="SafeCast AI Assistant"
          description="Ask for short guidance, then use voice to read the latest real backend response."
          language={language}
          placeholder="Ask SafeCast AI about preparation, live risk, route decisions, cleanup, or recovery..."
          emptyState="Ask a question to get live AI guidance. Voice playback reads only the latest backend response."
          examples={[
            "What should I prepare before heavy rain?",
            "What live risk should I check for my area?",
            "What should I do after water entered my home?",
          ]}
          accent="sky"
        />
      </SheetContent>
    </Sheet>
  );
}

export function SafeCastApp({
  initialTab = "preparedness",
}: {
  initialTab?: "preparedness" | "advisor" | "recovery";
}) {
  const [location, setLocation] = useState("Mumbai, India");
  const [submittedLocation, setSubmittedLocation] = useState("Mumbai, India");
  const [language, setLanguage] = useState("English");

  const live = useQuery({
    queryKey: ["live-safety-context", submittedLocation],
    queryFn: () =>
      getJson<LiveSafetyContext>(`/live-data?location=${encodeURIComponent(submittedLocation)}`),
    enabled: submittedLocation.trim().length > 1,
  });

  const mode =
    initialTab === "advisor"
      ? "during monsoon emergency advisor"
      : initialTab === "recovery"
        ? "after monsoon recovery"
        : "before monsoon preparedness";

  return (
    <TooltipProvider>
      <main className="min-h-full bg-background">
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 pb-28">
          <div className="grid gap-6">
            <div className="grid min-h-[calc(100svh-5rem)] content-start gap-5 rounded-xl border bg-background p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
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
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">
                    SafeCast AI: multilingual monsoon safety intelligence before, during, and after
                    severe weather.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    A civic safety command surface for households and responders: live weather,
                    live map context, grounded AI reasoning, multilingual support, and no fake
                    alerts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Live data policy">
                        <Info className="size-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Live data policy</DialogTitle>
                        <DialogDescription>
                          SafeCast AI does not show fake alerts. Weather comes from Open-Meteo, map lookup from OpenStreetMap Nominatim, public updates from GDELT, and AI responses stream from Gemini when configured.
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end">
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setSubmittedLocation(location)}
                        disabled={live.isFetching || location.trim().length < 2}
                      >
                        {live.isFetching ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                        Load live data
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fetches fresh map, weather, and public update data.</TooltipContent>
                  </Tooltip>
                  <div className="md:col-span-3">
                    <EmergencyProfileDialog />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-3">
                {entryCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.to} to={card.to} className="group block focus:outline-none">
                      <Card className="h-full transition-colors hover:border-sky-400 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring">
                        <CardHeader>
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="grid size-10 place-items-center rounded-lg border bg-background">
                              <Icon className="size-5 text-sky-600 dark:text-sky-300" />
                            </div>
                            <Badge variant="outline">{card.badge}</Badge>
                          </div>
                          <CardTitle>{card.title}</CardTitle>
                          <CardDescription>{card.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <span className="inline-flex h-10 w-full items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-sky-500">
                            Open working flow
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Weather", "Open-Meteo forecast and current conditions"],
                  ["Maps", "OpenStreetMap/Nominatim location intelligence"],
                  ["AI", "Gemini reasoning with live-data tools"],
                  ["Integrity", "Unavailable states instead of fabricated alerts"],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-lg border p-3">
                    <div className="font-medium text-foreground">{title}</div>
                    <div className="mt-1">{text}</div>
                  </div>
                ))}
              </div>

              {live.error ? (
                <Alert variant="warning">
                  <AlertTitle>Live data unavailable</AlertTitle>
                  <AlertDescription>{live.error.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <LiveDataPanel live={live.data} loading={live.isFetching} onRefresh={() => live.refetch()} />
            <EngineTabs location={submittedLocation} language={language} initialTab={initialTab} />
          </div>
        </section>
        <CompactAssistant location={submittedLocation} language={language} mode={mode} />
      </main>
    </TooltipProvider>
  );
}
