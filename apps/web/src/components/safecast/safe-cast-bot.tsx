import { useChat } from "@ai-sdk/react";
import { cn } from "@safecast/ui/lib/utils";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertCircle, Bot, CheckCircle2, Loader2, Mic, MicOff, Send, Square, Volume2, VolumeX } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getApiUrl } from "@/lib/api";

import { Markdown } from "./markdown";

type SpeechRecognitionResultLike = {
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SafeCastSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SafeCastSpeechRecognitionConstructor = new () => SafeCastSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SafeCastSpeechRecognitionConstructor;
    webkitSpeechRecognition?: SafeCastSpeechRecognitionConstructor;
  }
}

export type SafeCastBotState = "idle" | "listening" | "thinking" | "speaking" | "alert" | "error";

type Accent = "sky" | "emerald" | "amber";

type StatusChip = {
  label: string;
  variant: "default" | "secondary" | "outline" | "warning" | "destructive";
};

export type SafeCastBotProps = {
  api: string;
  requestBody?: Record<string, unknown>;
  title: string;
  description?: string;
  language?: string;
  placeholder?: string;
  emptyState?: string;
  examples?: string[];
  submitLabel?: string;
  submitTransform?: (text: string) => string;
  accent?: Accent;
  className?: string;
  showSpeech?: boolean;
  minHeightClassName?: string;
};

const accentStyles: Record<Accent, { user: string; focus: string }> = {
  sky: {
    user: "bg-sky-600 text-white",
    focus: "focus-visible:ring-sky-400",
  },
  emerald: {
    user: "bg-emerald-700 text-white",
    focus: "focus-visible:ring-emerald-400",
  },
  amber: {
    user: "bg-amber-600 text-white",
    focus: "focus-visible:ring-amber-400",
  },
};

const toolLabels: Record<string, string> = {
  classifyEmergencyIntent: "Issue classified",
  classifyRecoveryIssue: "Issue classified",
  generateSafetyPlan: "Safety plan drafted",
  geocodeLocation: "Map checked",
  getMapTrafficOrRoute: "Route checked",
  getNearbyEmergencyPlaces: "Emergency places checked",
  getRouteRisk: "Route checked",
  getWeather: "Weather checked",
  getWeatherForecast: "Weather checked",
  google_search: "News searched",
  searchLiveNewsOrAlerts: "News searched",
  searchLiveUpdates: "News searched",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSpeechLanguage(language: string | undefined) {
  switch (language) {
    case "Hindi":
      return "hi-IN";
    case "Bengali":
      return "bn-IN";
    case "Tamil":
      return "ta-IN";
    case "Telugu":
      return "te-IN";
    case "Marathi":
      return "mr-IN";
    case "Gujarati":
      return "gu-IN";
    case "Kannada":
      return "kn-IN";
    default:
      return "en-IN";
  }
}

function createSpeechRecognition(language: string | undefined) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = getSpeechLanguage(language);
  return recognition;
}

function getPartText(part: unknown) {
  if (!isRecord(part)) return "";
  return part.type === "text" && typeof part.text === "string" ? part.text : "";
}

function getToolName(part: unknown) {
  if (!isRecord(part) || typeof part.type !== "string" || !part.type.startsWith("tool-")) {
    return null;
  }

  return part.type.replace("tool-", "");
}

function outputLooksUnavailable(value: unknown, depth = 0): boolean {
  if (depth > 3) return false;
  if (Array.isArray(value)) return value.some((item) => outputLooksUnavailable(item, depth + 1));
  if (!isRecord(value)) return false;

  const status = typeof value.status === "string" ? value.status.toLowerCase() : "";
  const availability = typeof value.availability === "string" ? value.availability.toLowerCase() : "";
  const sourceStatus = typeof value.sourceStatus === "string" ? value.sourceStatus.toLowerCase() : "";

  if (
    status === "unavailable" ||
    availability === "unavailable" ||
    sourceStatus === "unavailable" ||
    value.liveDataAvailable === false ||
    value.available === false
  ) {
    return true;
  }

  return Object.values(value).some((item) => outputLooksUnavailable(item, depth + 1));
}

function outputUrgency(value: unknown, depth = 0): "high" | "critical" | null {
  if (depth > 3) return null;
  if (Array.isArray(value)) {
    return value.reduce<"high" | "critical" | null>((current, item) => {
      if (current === "critical") return current;
      const next = outputUrgency(item, depth + 1);
      return next === "critical" || next === "high" ? next : current;
    }, null);
  }
  if (!isRecord(value)) return null;

  const urgency = typeof value.urgency === "string" ? value.urgency.toLowerCase() : "";
  const dangerLevel = typeof value.dangerLevel === "string" ? value.dangerLevel.toLowerCase() : "";

  if (
    urgency === "critical" ||
    urgency === "seek_emergency_help" ||
    dangerLevel === "immediate_danger" ||
    value.needsEmergencyServices === true
  ) {
    return "critical";
  }

  if (urgency === "high" || urgency === "act_now" || dangerLevel === "unsafe_entry" || dangerLevel === "health_risk") {
    return "high";
  }

  return Object.values(value).reduce<"high" | "critical" | null>((current, item) => {
    if (current === "critical") return current;
    const next = outputUrgency(item, depth + 1);
    return next === "critical" || next === "high" ? next : current;
  }, null);
}

function collectStatusChips({
  messages,
  busy,
  error,
  speechError,
}: {
  messages: UIMessage[];
  busy: boolean;
  error: Error | undefined;
  speechError: string | null;
}) {
  const chips = new Map<string, StatusChip>();

  if (busy) {
    chips.set("Working", { label: "Working", variant: "secondary" });
  }

  for (const message of messages) {
    for (const part of message.parts) {
      const toolName = getToolName(part);
      if (!toolName) continue;

      const label = toolLabels[toolName] ?? `${toolName} checked`;
      chips.set(label, { label, variant: "outline" });

      if (isRecord(part)) {
        const partRecord = part as Record<string, unknown>;
        if (typeof partRecord.errorText === "string" || outputLooksUnavailable(partRecord.output)) {
          chips.set("Live data unavailable", { label: "Live data unavailable", variant: "warning" });
        }

        const urgency = outputUrgency(partRecord.output);
        if (urgency) {
          chips.set("Emergency risk", {
            label: "Emergency risk",
            variant: urgency === "critical" ? "destructive" : "warning",
          });
        }
      }
    }
  }

  if (error) {
    chips.set("Live AI unavailable", { label: "Live AI unavailable", variant: "destructive" });
  }

  if (speechError) {
    chips.set("Speech fallback", { label: "Speech fallback", variant: "warning" });
  }

  if (chips.size === 0) {
    chips.set("Ready", { label: "Ready", variant: "outline" });
  }

  return Array.from(chips.values());
}

function getLatestAssistantText(messages: UIMessage[]) {
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  if (!latestAssistantMessage) return "";

  return latestAssistantMessage.parts
    .map((part) => getPartText(part))
    .join("\n")
    .trim();
}

function ToolPart({ part }: { part: unknown }) {
  const toolName = getToolName(part);
  if (!toolName || !isRecord(part)) return null;

  const label = toolLabels[toolName] ?? toolName;
  const state = typeof part.state === "string" ? part.state : "running";
  const unavailable = typeof part.errorText === "string" || outputLooksUnavailable(part.output);

  return (
    <details className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs">
      <summary className="cursor-pointer list-none">
        <span className="inline-flex flex-wrap items-center gap-2">
          <Badge variant={unavailable ? "warning" : "outline"}>{label}</Badge>
          <span className="text-muted-foreground">{state}</span>
        </span>
      </summary>
      {typeof part.errorText === "string" ? <div className="mt-2 text-red-600">{part.errorText}</div> : null}
      {part.output !== undefined ? (
        <pre className="mt-2 max-h-56 overflow-auto rounded bg-background p-2">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      ) : null}
    </details>
  );
}

function ChatMessage({ message, accent }: { message: UIMessage; accent: Accent }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[94%] rounded-lg border px-3 py-2", isUser ? accentStyles[accent].user : "bg-background")}>
        {message.parts.map((part, index) => {
          const text = getPartText(part);
          if (text) {
            return isUser ? (
              <div key={`${message.id}-${index}`} className="whitespace-pre-wrap break-words text-sm">
                {text}
              </div>
            ) : (
              <Markdown key={`${message.id}-${index}`}>{text}</Markdown>
            );
          }

          return <ToolPart key={`${message.id}-${index}`} part={part} />;
        })}
      </div>
    </div>
  );
}

export function SafeCastBotAvatar({
  state,
  size = "md",
  className,
}: {
  state: SafeCastBotState;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "size-11" : size === "lg" ? "size-16" : "size-14";
  const iconClass = size === "sm" ? "size-5" : size === "lg" ? "size-8" : "size-7";
  const stateClass =
    state === "error"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      : state === "alert"
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : state === "listening"
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : state === "thinking"
            ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
            : state === "speaking"
              ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
              : "border-border bg-muted text-sky-700 dark:text-sky-300";

  return (
    <div className={cn("relative grid shrink-0 place-items-center rounded-lg border", sizeClass, stateClass, className)}>
      <Bot className={iconClass} aria-hidden="true" />
      {state === "thinking" ? (
        <Loader2 className="absolute -right-1 -top-1 size-4 animate-spin rounded-full bg-background text-sky-600" />
      ) : null}
      {state === "listening" ? (
        <span className="absolute -right-1 -top-1 size-4 animate-pulse rounded-full bg-emerald-500" />
      ) : null}
      {state === "speaking" ? (
        <span className="absolute -right-1 -top-1 flex size-4 items-end justify-center gap-0.5 rounded-full bg-background p-0.5">
          <span className="h-1.5 w-0.5 animate-pulse rounded bg-indigo-500" />
          <span className="h-2.5 w-0.5 animate-pulse rounded bg-indigo-500 [animation-delay:120ms]" />
          <span className="h-1.5 w-0.5 animate-pulse rounded bg-indigo-500 [animation-delay:240ms]" />
        </span>
      ) : null}
      {state === "alert" ? <AlertCircle className="absolute -right-1 -top-1 size-4 rounded-full bg-background text-amber-600" /> : null}
      {state === "error" ? <AlertCircle className="absolute -right-1 -top-1 size-4 rounded-full bg-background text-red-600" /> : null}
    </div>
  );
}

export function SafeCastBot({
  api,
  requestBody,
  title,
  description,
  language = "English",
  placeholder = "Ask SafeCast AI about your monsoon situation...",
  emptyState = "Ask about preparation, live local risk, route safety, evacuation decisions, cleanup, or recovery.",
  examples = [],
  submitLabel = "Send",
  submitTransform,
  accent = "sky",
  className,
  showSpeech = true,
  minHeightClassName = "min-h-80",
}: SafeCastBotProps) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const requestBodyKey = JSON.stringify(requestBody ?? {});
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: getApiUrl(api),
        credentials: "include",
        body: requestBody,
      }),
    [api, requestBodyKey],
  );

  const { messages, sendMessage, status, stop, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const latestAssistantText = useMemo(() => getLatestAssistantText(messages), [messages]);
  const statusChips = useMemo(
    () => collectStatusChips({ messages, busy, error, speechError }),
    [busy, error, messages, speechError],
  );
  const botState: SafeCastBotState = error
    ? "error"
    : listening
      ? "listening"
      : status === "submitted"
        ? "thinking"
        : status === "streaming" || speaking
          ? "speaking"
          : statusChips.some(
              (chip) =>
                chip.label === "Live data unavailable" ||
                chip.label === "Speech fallback" ||
                chip.label === "Emergency risk",
            )
            ? "alert"
            : "idle";

  async function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const outgoing = submitTransform ? submitTransform(trimmed).trim() : trimmed;
    if (!outgoing) return;

    setInput("");
    setSpeechError(null);
    await sendMessage({ text: outgoing });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await submitText(input);
  }

  function startSpeech() {
    if (!showSpeech || busy || listening) return;

    if (typeof window === "undefined") return;
    const recognition = createSpeechRecognition(language);
    if (!recognition) {
      setSpeechError("Speech recognition is unavailable in this browser. Type your message instead.");
      return;
    }

    setSpeechError(null);
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setInput((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript));
      setListening(false);
    };
    recognition.onerror = () => {
      setSpeechError("Speech capture failed. Type your message or try voice again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch {
      setSpeechError("Speech capture could not start. Type your message instead.");
      setListening(false);
    }
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function speakLatestResponse() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechError("Text-to-speech is unavailable in this browser.");
      return;
    }

    const spokenText = latestAssistantText.replace(/\s+/g, " ").trim();
    if (!spokenText) return;

    if (spokenText.length > 900) {
      setSpeechError("The latest backend response is longer than the short speech limit. Read the full guidance above.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = getSpeechLanguage(language);
    utterance.rate = 0.96;
    utterance.pitch = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeechError("Text-to-speech could not play the latest backend response.");
      setSpeaking(false);
    };

    setSpeechError(null);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <SafeCastBotAvatar state={botState} />
            <div className="min-w-0">
              <CardTitle className="text-base">{title}</CardTitle>
              {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
            </div>
          </div>
          <Badge variant={busy ? "secondary" : error ? "destructive" : "outline"}>{busy ? "working" : error ? "error" : "ready"}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {statusChips.map((chip) => (
            <Badge key={chip.label} variant={chip.variant}>
              {chip.variant === "outline" || chip.variant === "secondary" ? <CheckCircle2 className="mr-1 size-3" /> : null}
              {chip.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        {error ? (
          <Alert variant="warning">
            <AlertTitle>Live AI unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {speechError ? (
          <Alert variant="warning">
            <AlertTitle>Voice feature fallback</AlertTitle>
            <AlertDescription>{speechError}</AlertDescription>
          </Alert>
        ) : null}
        {examples.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <Button key={example} type="button" variant="outline" size="sm" onClick={() => setInput(example)}>
                {example}
              </Button>
            ))}
          </div>
        ) : null}
        <div className={cn("flex max-h-[34rem] flex-col gap-3 overflow-y-auto rounded-lg bg-muted/30 p-3", minHeightClassName)}>
          {messages.length === 0 ? (
            <div className="m-auto max-w-md text-center text-sm text-muted-foreground">{emptyState}</div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} accent={accent} />)
          )}
          {status === "submitted" ? (
            <div className="flex justify-start">
              <div className="grid w-48 gap-2 rounded-lg border bg-background p-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ) : null}
        </div>
        <form onSubmit={onSubmit} className="grid gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            aria-label={`Message ${title}`}
            className="min-h-24"
          />
          <div className="flex flex-wrap justify-end gap-2">
            {showSpeech ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" onClick={startSpeech} disabled={busy || listening}>
                    {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    {listening ? "Listening" : "Speak"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Use browser speech recognition when available.</TooltipContent>
              </Tooltip>
            ) : null}
            {speaking ? (
              <Button type="button" variant="outline" onClick={stopSpeaking}>
                <VolumeX className="size-4" />
                Stop voice
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={speakLatestResponse}
                    disabled={!latestAssistantText || busy}
                  >
                    <Volume2 className="size-4" />
                    Speak latest
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reads the latest backend AI response when it is short enough.</TooltipContent>
              </Tooltip>
            )}
            {busy ? (
              <Button type="button" variant="outline" onClick={() => stop()}>
                <Square className="size-4" />
                Stop
              </Button>
            ) : null}
            <Button type="submit" disabled={busy || !input.trim()} className={accentStyles[accent].focus}>
              <Send className="size-4" />
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
