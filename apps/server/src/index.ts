import { trpcServer } from "@hono/trpc-server";
import { google } from "@ai-sdk/google";
import { serve } from "@hono/node-server";
import { createContext } from "@safecast/api/context";
import { appRouter } from "@safecast/api/routers/index";
import { auth } from "@safecast/auth";
import { env } from "@safecast/env/server";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";

import { getAiUnavailablePayload, getGeminiModel, isAiConfigured } from "./lib/ai/model";
import { baseSafetySystemPrompt } from "./lib/ai/prompts";
import { getLiveSafetyContext } from "./lib/safety/live-context";
import {
  advisorRequestSchema,
  preparednessRequestSchema,
  recoveryRequestSchema,
} from "./lib/safety/schemas";
import {
  runAdvisorEngine,
  runPreparednessEngine,
  runRecoveryEngine,
} from "./lib/safety/engines";
import { createSafeCastTools } from "./lib/tools/safecast-tools";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  language: z.string().optional().default("English"),
  mode: z.string().optional().default("general monsoon safety"),
  location: z.string().optional().default(""),
});

app.post("/chat", async (c) => {
  if (!isAiConfigured()) {
    return c.json({ error: getAiUnavailablePayload() }, 503);
  }

  const body = chatRequestSchema.parse(await c.req.json());
  const system = [
    baseSafetySystemPrompt(body.language),
    `Conversation mode: ${body.mode}.`,
    body.location ? `User-selected location: ${body.location}.` : "No user-selected location.",
    "Use tools before making location-specific weather, map, or public-update claims.",
    "You may use google_search for grounded public information and must cite/mention sources when available.",
  ].join("\n");

  const result = streamText({
    model: getGeminiModel(),
    system,
    messages: await convertToModelMessages(body.messages),
    tools: {
      google_search: google.tools.googleSearch({}),
      ...createSafeCastTools(),
    },
    stopWhen: stepCountIs(5),
    maxOutputTokens: 1600,
  });

  return result.toUIMessageStreamResponse();
});

app.get("/live-data", async (c) => {
  const location = c.req.query("location") ?? "";
  return c.json(await getLiveSafetyContext(location));
});

app.post("/preparedness", async (c) => {
  const request = preparednessRequestSchema.parse(await c.req.json());
  return c.json(await runPreparednessEngine(request));
});

app.post("/advisor", async (c) => {
  const request = advisorRequestSchema.parse(await c.req.json());
  return c.json(await runAdvisorEngine(request));
});

app.post("/recovery", async (c) => {
  const request = recoveryRequestSchema.parse(await c.req.json());
  return c.json(await runRecoveryEngine(request));
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

const entrypoint = process.argv[1] ?? "";
if (entrypoint.endsWith("src/index.ts") || entrypoint.endsWith("src/index.js")) {
  serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
  });
}

export default app;
