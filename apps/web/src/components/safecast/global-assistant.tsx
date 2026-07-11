import { useRouterState } from "@tanstack/react-router";
import { MessageCircle, Volume2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { useSafeCastContext } from "@/hooks/use-safecast-context";

import { SafeCastAssistant } from "./assistant";
import { SafeCastBotAvatar } from "./safe-cast-bot";

function modeForPathname(pathname: string) {
  if (pathname.startsWith("/before")) return "before monsoon preparedness";
  if (pathname.startsWith("/bro")) return "during monsoon emergency advisor";
  if (pathname.startsWith("/after")) return "after monsoon recovery";
  return "general monsoon safety";
}

function speakGuidance(language: string, location: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const message = new SpeechSynthesisUtterance(
    "Welcome to SafeCast AI. Ask me anything about monsoon readiness, live risk, or recovery. Live data will show unavailable instead of fake alerts.",
  );
  message.lang =
    language === "Hindi"
      ? "hi-IN"
      : language === "Bengali"
        ? "bn-IN"
        : language === "Tamil"
          ? "ta-IN"
          : language === "Telugu"
            ? "te-IN"
            : language === "Marathi"
              ? "mr-IN"
              : language === "Gujarati"
                ? "gu-IN"
                : language === "Kannada"
                  ? "kn-IN"
                  : "en-IN";
  message.rate = 0.96;
  message.pitch = 0.95;
  message.text = `${message.text} Current location is ${location || "not set"}.`;
  window.speechSynthesis.speak(message);
}

export function GlobalAssistant() {
  const { location, language } = useSafeCastContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const mode = useMemo(() => modeForPathname(pathname), [pathname]);

  return (
    <Sheet>
      <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-lg">
        <button
          type="button"
          onClick={() => speakGuidance(language, location)}
          className="relative grid size-11 place-items-center rounded-lg border border-border bg-muted text-sky-400 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Hear SafeCast AI guidance"
        >
          <SafeCastBotAvatar state="idle" size="sm" className="border-none bg-transparent" />
          <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-emerald-500" />
        </button>
        <div className="hidden min-w-0 sm:block">
          <div className="text-sm font-medium">SafeCast assistant</div>
          <div className="truncate text-xs text-muted-foreground">Available on every SafeCast page</div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => speakGuidance(language, location)}
          aria-label="Speak guidance"
        >
          <Volume2 className="size-4" />
        </Button>
        <SheetTrigger asChild>
          <Button type="button" size="icon" aria-label="Open assistant panel">
            <MessageCircle className="size-4" />
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent className="w-full max-w-md overflow-y-auto sm:w-[28rem]">
        <SheetHeader className="mb-4">
          <SheetTitle>SafeCast AI Assistant</SheetTitle>
          <SheetDescription>
            Streaming multilingual safety chat with live weather, map, and public-update tools — follows you across
            Readiness, /bro, and Recovery.
          </SheetDescription>
        </SheetHeader>
        <SafeCastAssistant location={location} language={language} mode={mode} />
      </SheetContent>
    </Sheet>
  );
}
