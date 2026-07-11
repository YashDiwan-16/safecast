import { useQuery } from "@tanstack/react-query";
import { Home } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getJson } from "@/lib/api";
import { useSafeCastContext } from "@/hooks/use-safecast-context";
import type { LiveSafetyContext } from "@/lib/safecast-types";

import { LiveDataPanel } from "./live-data-panel";
import { RecoveryAssistant } from "./recovery-assistant";

export function RecoveryPage() {
  const { location, language } = useSafeCastContext();

  const live = useQuery({
    queryKey: ["live-safety-context", location],
    queryFn: () => getJson<LiveSafetyContext>(`/live-data?location=${encodeURIComponent(location)}`),
    enabled: location.trim().length > 1,
  });

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8">
      <div>
        <Badge variant="secondary" className="mb-3">
          <Home className="size-3" />
          Recovery assistant
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Recovery — After Monsoon</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Plan safe re-entry, cleanup, documentation, and sanitation steps for{" "}
          <span className="text-foreground">{location || "your location"}</span>.
        </p>
      </div>

      <LiveDataPanel live={live.data} loading={live.isFetching} onRefresh={() => live.refetch()} />
      <RecoveryAssistant location={location} language={language} />
    </main>
  );
}
