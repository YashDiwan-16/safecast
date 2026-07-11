import { useMemo } from "react";

import { SafeCastBot } from "./safe-cast-bot";

export function SafeCastAssistant({
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
    <SafeCastBot
      api="/chat"
      requestBody={requestBody}
      title="SafeCast AI Assistant"
      description="Streaming safety chat with live weather, map, and public-update tools."
      language={language}
      placeholder="Ask SafeCast AI about preparation, live risk, route decisions, cleanup, or recovery..."
      emptyState="Ask about preparation, waterlogging, evacuation decisions, supply lists, cleanup, or live local risk."
      examples={[
        "What should my family prepare this week?",
        "What live weather risk should I know for my area?",
        "What should I avoid during heavy rain?",
      ]}
      accent="sky"
    />
  );
}
