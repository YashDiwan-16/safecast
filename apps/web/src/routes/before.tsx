import { createFileRoute } from "@tanstack/react-router";

import { SafeCastApp } from "@/components/safecast/app";

export const Route = createFileRoute("/before")({
  component: BeforeComponent,
});

function BeforeComponent() {
  return <SafeCastApp initialTab="preparedness" />;
}
