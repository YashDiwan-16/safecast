import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Square } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getApiUrl } from "@/lib/api";

import { BotPersona } from "./bot-persona";
import { Markdown } from "./markdown";

function getPartText(part: unknown) {
  if (typeof part !== "object" || part === null) return "";
  const typed = part as { type?: string; text?: string };
  return typed.type === "text" && typeof typed.text === "string" ? typed.text : "";
}

function ToolPart({ part }: { part: unknown }) {
  if (typeof part !== "object" || part === null) return null;
  const typed = part as { type?: string; state?: string; input?: unknown; output?: unknown; errorText?: string };
  if (!typed.type?.startsWith("tool-")) return null;

  return (
    <div className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="mb-1 font-medium">{typed.type.replace("tool-", "Tool: ")}</div>
      <div className="text-muted-foreground">State: {typed.state ?? "running"}</div>
      {typed.errorText ? <div className="mt-1 text-red-600">{typed.errorText}</div> : null}
      {typed.output !== undefined ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-background p-2">
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
      <div
        className={`max-w-[92%] rounded-lg border px-3 py-2 ${
          isUser ? "bg-sky-600 text-white" : "bg-background"
        }`}
      >
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

export function SafeCastAssistant({
  location,
  language,
  mode,
}: {
  location: string;
  language: string;
  mode: string;
}) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: getApiUrl("/chat"),
        credentials: "include",
        body: { location, language, mode },
      }),
    [language, location, mode],
  );

  const { messages, sendMessage, status, stop, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <BotPersona status={status === "streaming" ? "speaking" : status === "submitted" ? "thinking" : "idle"} />
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        {error ? (
          <Alert variant="warning">
            <AlertTitle>AI chat unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex max-h-[34rem] min-h-80 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/30 p-3">
          {messages.length === 0 ? (
            <div className="m-auto max-w-sm text-center text-sm text-muted-foreground">
              Ask about preparation, waterlogging, evacuation decisions, supply lists, cleanup, or live local risk.
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
        </div>
        <form onSubmit={onSubmit} className="grid gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask SafeCast AI about your monsoon situation..."
            aria-label="Message SafeCast AI"
          />
          <div className="flex justify-end gap-2">
            {busy ? (
              <Button type="button" variant="outline" onClick={() => stop()}>
                <Square className="size-4" />
                Stop
              </Button>
            ) : null}
            <Button type="submit" disabled={busy || !input.trim()}>
              <Send className="size-4" />
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
