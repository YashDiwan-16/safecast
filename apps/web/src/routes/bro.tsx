import { createFileRoute } from "@tanstack/react-router";

import { SafeCastApp } from "@/components/safecast/app";

export const Route = createFileRoute("/bro")({
  component: BroComponent,
});

function BroComponent() {
  return <SafeCastApp initialTab="advisor" />;
}
