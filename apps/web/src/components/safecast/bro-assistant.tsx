import { useMemo } from "react";

import { SafeCastBot } from "./safe-cast-bot";

const examples = [
  "/bro should I go to office today?",
  "/bro check if my route is safe",
  "/bro my kid's school bus is delayed",
  "/bro water is entering my house",
  "/bro I am stuck in traffic during heavy rain",
];

function readEmergencyProfile() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem("safecast-emergency-profile") ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function BroAssistant({
  location,
  language,
}: {
  location: string;
  language: string;
}) {
  const profile = useMemo(() => readEmergencyProfile(), []);
  const requestBody = useMemo(() => ({ location, language, profile }), [language, location, profile]);

  return (
    <SafeCastBot
      api="/bro-chat"
      requestBody={requestBody}
      title="During Monsoon /bro Assistant"
      description="Ask in any supported language. /bro uses live tools before making weather, route, or alert claims."
      language={language}
      placeholder="/bro ask about office, route risk, school delays, water entering home, traffic..."
      emptyState="Try “/bro should I go to office today?” or “/bro water is entering my house”. If route details are missing, /bro will ask for origin and destination."
      examples={examples}
      submitLabel="Ask /bro"
      submitTransform={(text) => (text.trim().startsWith("/bro") ? text.trim() : `/bro ${text.trim()}`)}
      accent="sky"
      minHeightClassName="min-h-96"
    />
  );
}
