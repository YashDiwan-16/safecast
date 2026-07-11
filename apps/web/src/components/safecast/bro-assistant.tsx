import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Mic, MicOff, Send, Square } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/api";

import { Markdown } from "./markdown";

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SpeechRecognitionResultLike = {
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const examples = [
  "/bro should I go to office today?",
  "/bro check if my route is safe",
  "/bro my kid's school bus is delayed",
  "/bro water is entering my house",
  "/bro I am stuck in traffic during heavy rain",
];

function getPartText(part: unknown) {
  if (typeof part !== "object" || part === null) return "";
  const typed = part as { type?: string; text?: string };
  return typed.type === "text" && typeof typed.text === "string" ? typed.text : "";
}

function ToolPart({ part }: { part: unknown }) {
  if (typeof part !== "object" || part === null) return null;
  const typed = part as { type?: string; state?: string; output?: unknown; errorText?: string };
  if (!typed.type?.startsWith("tool-")) return null;

  return (
    <div className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{typed.type.replace("tool-", "")}</Badge>
        <span className="text-muted-foreground">{typed.state ?? "running"}</span>
      </div>
      {typed.errorText ? <div className="text-red-600">{typed.errorText}</div> : null}
      {typed.output !== undefined ? (
        <pre className="mt-2 max-h-56 overflow-auto rounded bg-background p-2">
          {JSON.stringify(typed.output, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[94%] rounded-lg border px-3 py-2 ${isUser ? "bg-sky-600 text-white" : "bg-background"}`}>
        {message.parts.map((part, index) => {
          const text = getPartText(part);
          if (text) {
            return isUser ? (
              <div key={`${message.id}-${index}`} className="whitespace-pre-wrap text-sm">
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

function createSpeechRecognition(language: string) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang =
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
  return recognition;
}

export function BroAssistant({
  location,
  language,
}: {
  location: string;
  language: string;
}) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const profile = useMemo(() => {
    try {
      return JSON.parse(window.localStorage.getItem("safecast-emergency-profile") ?? "{}") as Record<
        string,
        unknown
      >;
    } catch {
      return {};
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: getApiUrl("/bro-chat"),
        credentials: "include",
        body: { location, language, profile },
      }),
    [language, location, profile],
  );
  const { messages, sendMessage, status, stop, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  async function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    await sendMessage({ text: trimmed.startsWith("/bro") ? trimmed : `/bro ${trimmed}` });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await submitText(input);
  }

  function startSpeech() {
    const recognition = createSpeechRecognition(language);
    if (!recognition) {
      setSpeechError("Speech input is unavailable in this browser. Type your /bro message instead.");
      return;
    }

    setSpeechError(null);
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => {
      setSpeechError("Speech capture failed. Please try again or type your message.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>During Monsoon /bro Assistant</CardTitle>
            <CardDescription>
              Ask in any supported language. /bro uses live tools before making weather, route, or alert claims.
            </CardDescription>
          </div>
          <Badge variant={busy ? "secondary" : "outline"}>{busy ? "working" : "ready"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button key={example} type="button" variant="outline" size="sm" onClick={() => setInput(example)}>
              {example}
            </Button>
          ))}
        </div>
        {error ? (
          <Alert variant="warning">
            <AlertTitle>/bro unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {speechError ? (
          <Alert variant="warning">
            <AlertTitle>Speech input unavailable</AlertTitle>
            <AlertDescription>{speechError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex max-h-[34rem] min-h-96 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/30 p-3">
          {messages.length === 0 ? (
            <div className="m-auto max-w-md text-center text-sm text-muted-foreground">
              Try “/bro should I go to office today?” or “/bro water is entering my house”. If
              route details are missing, /bro will ask for origin and destination.
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
        </div>
        <form onSubmit={onSubmit} className="grid gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="/bro ask about office, route risk, school delays, water entering home, traffic..."
            aria-label="Message /bro"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={startSpeech} disabled={listening || busy}>
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {listening ? "Listening" : "Speak"}
            </Button>
            {busy ? (
              <Button type="button" variant="outline" onClick={() => stop()}>
                <Square className="size-4" />
                Stop
              </Button>
            ) : null}
            <Button type="submit" disabled={busy || !input.trim()}>
              <Send className="size-4" />
              Ask /bro
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
