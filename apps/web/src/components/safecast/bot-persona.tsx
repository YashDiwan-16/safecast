import { Bot, Languages } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

const greetings = ["Stay ready", "तैयार रहें", "সতর্ক থাকুন", "தயார் இருங்கள்", "సిద్ధంగా ఉండండి"];

export function BotPersona({ status }: { status: "idle" | "thinking" | "speaking" }) {
  const [index, setIndex] = useState(0);
  const label = useMemo(() => greetings[index % greetings.length], [index]);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((value) => value + 1), 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-12 place-items-center rounded-lg border bg-gradient-to-br from-sky-50 via-emerald-50 to-amber-50 text-sky-700 shadow-sm dark:from-sky-950 dark:via-emerald-950 dark:to-amber-950 dark:text-sky-200">
        <Bot className="size-6" />
        <div className="absolute -bottom-1 flex gap-0.5">
          {[0, 1, 2].map((bar) => (
            <span
              key={bar}
              className="h-2 w-1 rounded-sm bg-emerald-500 data-[active=true]:animate-pulse"
              data-active={status !== "idle" || undefined}
              style={{ animationDelay: `${bar * 120}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold">SafeCast AI</div>
          <Badge variant={status === "idle" ? "outline" : "secondary"}>
            {status === "thinking" ? "Thinking" : status === "speaking" ? "Streaming" : "Live"}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Languages className="size-3" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
