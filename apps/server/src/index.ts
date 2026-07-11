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

import { formatAiError } from "./lib/ai/errors";
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
import { createBroTools } from "./lib/tools/bro-tools";
import { createRecoveryTools } from "./lib/tools/recovery-tools";
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
    maxRetries: 0,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => formatAiError(error),
  });
});

const broChatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  language: z.string().optional().default("auto-detect"),
  location: z.string().optional().default(""),
  profile: z.record(z.string(), z.unknown()).optional().default({}),
});

app.post("/bro-chat", async (c) => {
  if (!isAiConfigured()) {
    return c.json({ error: getAiUnavailablePayload() }, 503);
  }

  const body = broChatRequestSchema.parse(await c.req.json());
  const system = [
    "You are /bro, SafeCast AI's main real-time monsoon safety agent.",
    "The user may type or speak in any supported language. Detect the user's language and answer in the same language unless they ask otherwise.",
    "You must use tools before making live claims about weather, routes, emergency places, maps, traffic, or public alerts.",
    "Never invent live conditions, road closures, shelters, hospitals, alerts, school-bus status, or traffic.",
    "If route, map, traffic, weather, or news data is unavailable, say exactly what is unavailable and continue with cautious general safety guidance.",
    "When route or commute decisions are requested, give a clear decision: go, delay, avoid, cancel, or verify locally.",
    "When safety is urgent, include emergency steps, who to notify, and what to do next.",
    "If origin/destination is missing for a route request, ask for it instead of guessing.",
    body.location ? `Default user location: ${body.location}.` : "No default user location was provided.",
    `User profile context: ${JSON.stringify(body.profile)}.`,
    `Preferred language hint: ${body.language}.`,
    `Current date: ${new Date().toISOString()}.`,
  ].join("\n");

  const result = streamText({
    model: getGeminiModel(),
    system,
    messages: await convertToModelMessages(body.messages),
    tools: createBroTools(),
    stopWhen: stepCountIs(8),
    maxOutputTokens: 1700,
    maxRetries: 0,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => formatAiError(error),
  });
});

const recoveryChatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  language: z.string().optional().default("auto-detect"),
  location: z.string().optional().default(""),
  profile: z.record(z.string(), z.unknown()).optional().default({}),
});

app.post("/recovery-chat", async (c) => {
  if (!isAiConfigured()) {
    return c.json({ error: getAiUnavailablePayload() }, 503);
  }

  const body = recoveryChatRequestSchema.parse(await c.req.json());
  const system = [
    "You are SafeCast AI's After Monsoon Recovery assistant.",
    "The user may describe issues such as clogged drains, stagnant water, contaminated drinking water, fallen wires, damaged vehicle, water entered home, mosquito risk, spoiled food, wall cracks, or blocked road.",
    "Detect the user's language and answer in the same language unless they ask otherwise.",
    "Ask clarifying questions only if required for safety. If immediate danger is possible, give safety-first guidance before asking questions.",
    "Use tools before making live claims about weather, nearby emergency places, public notices, blocked roads, or local recovery updates.",
    "Never invent live conditions, road closures, official notices, phone numbers, authority names, emergency places, or disease outbreaks.",
    "If weather, news/public updates, or emergency-place data is unavailable, say exactly what is unavailable and continue with cautious general recovery guidance.",
    "Image upload and image-risk scanning are not implemented in this assistant. Do not ask for images and do not claim to inspect photos.",
    "For every recovery guidance answer, render markdown with these sections:",
    "- Immediate danger assessment.",
    "- What not to touch/use.",
    "- Cleaning and sanitation steps.",
    "- Drinking water safety.",
    "- Disease and mosquito prevention.",
    "- Electrical hazard precautions.",
    "- Damage documentation checklist.",
    "- Local authority/community report draft.",
    "- When to call emergency services.",
    "- Follow-up reminders.",
    "If the user has not provided enough detail for one section, state what is unknown rather than inventing details.",
    body.location ? `Default user location: ${body.location}.` : "No default user location was provided.",
    `User profile context: ${JSON.stringify(body.profile)}.`,
    `Preferred language hint: ${body.language}.`,
    `Current date: ${new Date().toISOString()}.`,
  ].join("\n");

  const result = streamText({
    model: getGeminiModel(),
    system,
    messages: await convertToModelMessages(body.messages),
    tools: createRecoveryTools(),
    stopWhen: stepCountIs(6),
    maxOutputTokens: 1800,
    maxRetries: 0,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => formatAiError(error),
  });
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
