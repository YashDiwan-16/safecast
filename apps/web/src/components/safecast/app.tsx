import { useQuery } from "@tanstack/react-query";
import { Info, Menu, Radar, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
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

import { SafeCastAssistant } from "./assistant";
import { EngineTabs } from "./engine-tabs";
import { LiveDataPanel } from "./live-data-panel";

const languages = ["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];

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
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-6">
            <div className="grid gap-5 rounded-xl border bg-background/90 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      <Radar className="size-3" />
                      Live weather, maps, and public updates
                    </Badge>
                    <Badge variant="outline">Gemini AI SDK v6</Badge>
                  </div>
                  <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">SafeCast AI</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    A live monsoon safety workspace for preparing before rain, acting during flooding, and recovering after impact.
                  </p>
                </div>
                <div className="flex items-center gap-2 lg:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Open assistant">
                        <Menu className="size-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full max-w-md overflow-y-auto sm:w-[28rem]">
                      <SheetHeader className="mb-4">
                        <SheetTitle>SafeCast AI Assistant</SheetTitle>
                        <SheetDescription>Streaming safety chat with live tools.</SheetDescription>
                      </SheetHeader>
                      <SafeCastAssistant location={submittedLocation} language={language} mode={mode} />
                    </SheetContent>
                  </Sheet>
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
                </CardContent>
              </Card>

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

          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <SafeCastAssistant location={submittedLocation} language={language} mode={mode} />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="mt-3 px-0">
                    <Info className="size-4" />
                    Live data policy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Live data policy</DialogTitle>
                    <DialogDescription>
                      Every panel either calls real APIs or shows an unavailable state. SafeCast AI never fabricates alerts, weather, map data, or public updates.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </aside>
        </section>
      </main>
    </TooltipProvider>
  );
}
