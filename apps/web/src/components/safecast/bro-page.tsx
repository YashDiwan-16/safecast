import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getJson } from "@/lib/api";
import { useSafeCastContext } from "@/hooks/use-safecast-context";
import type { LiveSafetyContext } from "@/lib/safecast-types";

import { BroAssistant } from "./bro-assistant";
import { LiveDataPanel } from "./live-data-panel";

export function BroPage() {
  const { location, language } = useSafeCastContext();

  const live = useQuery({
    queryKey: ["live-safety-context", location],
    queryFn: () => getJson<LiveSafetyContext>(`/live-data?location=${encodeURIComponent(location)}`),
    enabled: location.trim().length > 1,
  });

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8">
      <div>
        <Badge variant="outline" className="mb-3">
          <ShieldAlert className="size-3" />
          Live advisor
        </Badge>
        <h1 className="font-mono text-3xl font-semibold tracking-tight text-sky-400 sm:text-4xl">/bro</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ask /bro for immediate, situation-aware safety guidance during flooding or severe rainfall near{" "}
          <span className="text-foreground">{location || "your location"}</span>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LiveDataPanel live={live.data} loading={live.isFetching} onRefresh={() => live.refetch()} />
        <BroAssistant location={location} language={language} />
      </div>
    </main>
  );
}
