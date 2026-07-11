import { createFileRoute } from "@tanstack/react-router";

import { SafeCastApp } from "@/components/safecast/app";

export const Route = createFileRoute("/after")({
  component: AfterComponent,
});

function AfterComponent() {
  return <SafeCastApp initialTab="recovery" />;
}
