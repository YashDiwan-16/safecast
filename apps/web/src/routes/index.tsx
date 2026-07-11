import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/safecast/home-page";

export const Route = createFileRoute("/")({
  component: HomePage,
});
