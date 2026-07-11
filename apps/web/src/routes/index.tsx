import { createFileRoute } from "@tanstack/react-router";

import { SafeCastApp } from "@/components/safecast/app";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <SafeCastApp />;
}
