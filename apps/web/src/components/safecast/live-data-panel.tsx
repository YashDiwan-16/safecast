import { ExternalLink, RefreshCcw, Umbrella, Waves, Wind } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LiveSafetyContext } from "@/lib/safecast-types";

import { LiveMap } from "./live-map";

function valueOrDash(value?: number | null, suffix = "") {
  return value === undefined || value === null ? "Unavailable" : `${value}${suffix}`;
}

export function LiveDataPanel({
  live,
  loading,
  onRefresh,
}: {
  live?: LiveSafetyContext;
  loading?: boolean;
  onRefresh: () => void;
}) {
  const weather = live?.weather.status === "available" ? live.weather.data : undefined;
  const updates = live?.updates.status === "available" ? live.updates.data : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Live Situation</CardTitle>
            <CardDescription>Weather, map, and public updates are fetched live.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCcw className="size-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <LiveMap result={live?.map} loading={loading} />
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : weather ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <Umbrella className="mb-2 size-5 text-sky-500" />
                <div className="text-xs text-muted-foreground">Condition</div>
                <div className="font-medium">{weather.current.condition}</div>
              </div>
              <div className="rounded-lg border p-3">
                <Waves className="mb-2 size-5 text-emerald-500" />
                <div className="text-xs text-muted-foreground">Rain now</div>
                <div className="font-medium">{valueOrDash(weather.current.rainMm, " mm")}</div>
              </div>
              <div className="rounded-lg border p-3">
                <Wind className="mb-2 size-5 text-amber-500" />
                <div className="text-xs text-muted-foreground">Wind gust</div>
                <div className="font-medium">{valueOrDash(weather.current.gustKph, " km/h")}</div>
              </div>
            </div>
          ) : (
            <Alert variant="warning">
              <AlertTitle>Live weather unavailable</AlertTitle>
              <AlertDescription>
                {live?.weather.status === "unavailable"
                  ? live.weather.reason
                  : "Search a location to load weather."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Public Updates</CardTitle>
          <CardDescription>Recent public web/news matches from GDELT.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : updates.length > 0 ? (
            <div className="space-y-3">
              {updates.slice(0, 6).map((article) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">{article.domain ?? article.source ?? "public web"}</Badge>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium leading-snug">{article.title}</div>
                </a>
              ))}
            </div>
          ) : (
            <Alert variant="warning">
              <AlertTitle>Live updates unavailable</AlertTitle>
              <AlertDescription>
                {live?.updates.status === "unavailable"
                  ? live.updates.reason
                  : "Search a location to load public updates."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
