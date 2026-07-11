import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Square } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/api";

import { Markdown } from "./markdown";

const examples = [
  "Water entered my home and there is a bad smell",
  "There are fallen wires near my building",
  "My drinking water looks muddy after flooding",
  "Stagnant water and mosquitoes are around my house",
  "Wall cracks appeared after the rain",
  "A road near us is blocked by debris",
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
      <div className={`max-w-[94%] rounded-lg border px-3 py-2 ${isUser ? "bg-emerald-700 text-white" : "bg-background"}`}>
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

export function RecoveryAssistant({
  location,
  language,
}: {
  location: string;
  language: string;
}) {
  const [input, setInput] = useState("");

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
        api: getApiUrl("/recovery-chat"),
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
    await sendMessage({ text: trimmed });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await submitText(input);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>After Monsoon Recovery Assistant</CardTitle>
            <CardDescription>
              Describe the recovery issue. SafeCast will use Gemini and live context when it needs local facts.
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
            <AlertTitle>Recovery assistant unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex max-h-[34rem] min-h-96 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/30 p-3">
          {messages.length === 0 ? (
            <div className="m-auto max-w-md text-center text-sm text-muted-foreground">
              Try “fallen wires near my building”, “stagnant water and mosquitoes”, or “drinking water looks muddy”.
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
        </div>
        <form onSubmit={onSubmit} className="grid gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe the recovery issue, location details, visible hazards, and who is affected..."
            aria-label="Message recovery assistant"
          />
          <div className="flex flex-wrap justify-end gap-2">
            {busy ? (
              <Button type="button" variant="outline" onClick={() => stop()}>
                <Square className="size-4" />
                Stop
              </Button>
            ) : null}
            <Button type="submit" disabled={busy || !input.trim()}>
              <Send className="size-4" />
              Ask recovery assistant
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
