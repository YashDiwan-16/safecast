import { Toaster } from "@safecast/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalAssistant } from "@/components/safecast/global-assistant";
import { SafeCastContextProvider } from "@/hooks/use-safecast-context";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
          {
            title: "SafeCast AI",
          },
          {
            name: "description",
            content: "Live monsoon safety assistant with AI, weather, maps, and public updates.",
          },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <SafeCastContextProvider>
          <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
            <Header />
            <Outlet />
            <Footer />
          </div>
          <GlobalAssistant />
          <Toaster richColors />
        </SafeCastContextProvider>
      </ThemeProvider>
      {import.meta.env.DEV ? (
        <>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        </>
      ) : null}
    </>
  );
}
