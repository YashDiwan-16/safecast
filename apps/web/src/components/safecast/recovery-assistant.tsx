import { useMemo } from "react";

import { SafeCastBot } from "./safe-cast-bot";

const examples = [
  "Water entered my home and there is a bad smell",
  "There are fallen wires near my building",
  "My drinking water looks muddy after flooding",
  "Stagnant water and mosquitoes are around my house",
  "Wall cracks appeared after the rain",
  "A road near us is blocked by debris",
];

function readEmergencyProfile() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem("safecast-emergency-profile") ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function RecoveryAssistant({
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
      api="/recovery-chat"
      requestBody={requestBody}
      title="After Monsoon Recovery Assistant"
      description="Describe the recovery issue. SafeCast uses Gemini and live context when it needs local facts."
      language={language}
      placeholder="Describe the recovery issue, location details, visible hazards, and who is affected..."
      emptyState="Try “fallen wires near my building”, “stagnant water and mosquitoes”, or “drinking water looks muddy”."
      examples={examples}
      submitLabel="Ask recovery assistant"
      accent="emerald"
      minHeightClassName="min-h-96"
    />
  );
}
