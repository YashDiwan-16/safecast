# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SafeCast AI — a multilingual monsoon safety product with three flows: **Before** (`/before`, preparedness planning), **During** (`/bro`, live safety advisor chat), and **After** (`/after`, recovery guidance). Scaffolded with Better-T-Stack (`bts.jsonc`; safe to delete, regenerate addons with `pnpm dlx create-better-t-stack add`).

**Core product invariant: never fabricate live data.** Every live source (weather, geocoding/routing, emergency places, news) returns a discriminated `{ status: "available", data }` / `{ status: "unavailable", reason }` result, and both the AI prompts and the UI are required to surface "unavailable" honestly instead of inventing alerts, traffic, closures, or contact info. Keep this pattern when touching anything in `apps/server/src/lib/`.

## Commands

```bash
pnpm install                # install deps (workspace root)
pnpm run dev                # run all apps in dev (nx run-many -t dev)
pnpm run dev:web            # web only, http://localhost:3001
pnpm run dev:server         # server only, http://localhost:3000
pnpm run build              # build all (nx run-many -t build)
pnpm run check-types        # typecheck all projects (nx run-many -t check-types)
```

Per-package equivalents (run from `apps/server` or `apps/web`): `tsx watch src/index.ts` (server dev), `tsdown` (server build), `vite dev` / `vite build` (web).

There is no automated test runner in this repo. `test-cases/README.md` holds manual/API smoke test cases (P0/P1/P2) executed by hand against the running dev servers — check it after changing a flow described there, and update it if behavior changes. There is also no lint script configured.

### Vercel deployment

```bash
pnpm run deploy:setup        # vercel link (first time)
pnpm run dev:vercel          # vercel dev -L, runs both services locally
pnpm run env:preview         # sync local .env files to Vercel preview
pnpm run env:production      # sync local .env files to Vercel production
pnpm run deploy              # preview deploy
pnpm run deploy:prod         # production deploy
pnpm run deploy:check        # dry-run, no upload
```

Vercel Services share project env vars but don't auto-upload local `.env` files — run the `env:*` sync commands before the first deploy. `vercel.json` defines two services (`web`, `server`); `/api/*` on the web service routes to the server service, with `/api/auth/*` specially excluded from the path-strip rewrite so Better Auth's own `/api/auth` base path still matches server-side (see `packages/env/src/server.ts` `getVercelOrigin`/`BETTER_AUTH_URL` logic).

## Architecture

pnpm workspace (`apps/*`, `packages/*`) orchestrated by **Nx** (`nx.json`) for caching/task graph — `dev` is never cached, `build`/`check-types` depend on upstream packages' same target.

- **`apps/server`** — Hono app (`src/index.ts`), run via `tsx` in dev, bundled with `tsdown` for prod, `bun build --compile` for a standalone binary. Mounts the tRPC router at `/trpc/*` for authenticated typed queries, and separate plain REST/streaming endpoints for the AI safety features:
  - `POST /chat`, `/bro-chat`, `/recovery-chat` — streaming (`streamText`/`toUIMessageStreamResponse`) Gemini chat endpoints, each with its own system prompt and tool set (`lib/tools/safecast-tools.ts`, `bro-tools.ts`, `recovery-tools.ts`).
  - `POST /preparedness`, `/advisor`, `/recovery` — structured (`generateText` + `Output.object` + zod schema from `lib/safety/schemas.ts`) engine endpoints, implemented in `lib/safety/engines.ts`.
  - `GET /live-data` — fetches live weather/map/news context without AI, via `lib/safety/live-context.ts`.
  - All AI endpoints check `isAiConfigured()` (`lib/ai/model.ts`) first and return a 503 `{ status: "unavailable" }` payload if no Gemini key is set, rather than erroring.
  - Live data sources live under `lib/maps/` (Nominatim geocoding, OSRM routing/Overpass emergency places), `lib/weather/open-meteo.ts`, `lib/news/gdelt.ts` — each returns the `available`/`unavailable` shape.
- **`apps/web`** — Vite + React 19 + TanStack Router (file-based routes in `src/routes/`) + TanStack Query. Route `/_auth/*` is a layout route whose `beforeLoad` redirects to `/login` if `authClient.getSession()` has no session (see `src/routes/_auth/route.tsx`); `dashboard.tsx` lives under it. Main product routes (`/`, `/before`, `/bro`, `/after`) are public. `src/lib/api.ts` wraps `fetch` to the server (`getApiUrl` resolves `VITE_SERVER_URL`, same-origin `/api` path in prod via the Vercel rewrite, `http://localhost:3000` fallback in dev). `src/utils/trpc.ts` sets up the typed tRPC client for the `_auth` dashboard's private data.
- **`packages/api`** — tRPC router/context (`t.router`, `publicProcedure`, `protectedProcedure`). `protectedProcedure` throws `UNAUTHORIZED` if there's no session. Add new typed procedures to `routers/index.ts`; this is separate from the plain REST safety endpoints in `apps/server`, which intentionally bypass tRPC.
- **`packages/auth`** — `better-auth` config with the Mongo adapter (`createAuth`/`auth`), email+password only, cross-site cookies (`sameSite: "none", secure: true`) since web/server are different Vercel services in prod.
- **`packages/db`** — connects Mongoose (`mongoose.connect(env.DATABASE_URL)`) at import time and exports the raw MongoDB `client` (via `mongoose.connection.getClient()`) for the Better Auth Mongo adapter. `models/auth.model.ts` defines the User/Session/Account/Verification collections Better Auth expects.
- **`packages/env`** — `@t3-oss/env-core` validated env, split into `server.ts` (Node/Bun-side: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `GEMINI_API_KEY`/`GOOGLE_GENERATIVE_AI_API_KEY`, `SAFETY_AI_MODEL`) and `web.ts` (Vite-side, `VITE_` prefixed only: `VITE_SERVER_URL`). Import `@safecast/env/server` or `@safecast/env/web` — never cross-import one into the other's app.
- **`packages/ui`** — shared shadcn/ui primitives (`@safecast/ui/components/*`, `@safecast/ui/lib/*`, global styles at `@safecast/ui/globals.css`). Add new shared primitives from repo root: `npx shadcn@latest add <name> -c packages/ui`. Note: `apps/web/src/components/ui/*` already contains app-specific, restyled copies of several primitives (button, card, dialog, etc. with a custom sky/emerald palette) — these are edited directly rather than re-exported from `packages/ui`; check which one a route actually imports (`@/components/ui/*` vs `@safecast/ui/components/*`) before assuming there's one source of truth.
- **`packages/config`** — shared `tsconfig.base.json` only, no source.

## Conventions worth knowing

- AI system prompts (in `apps/server/src/index.ts` and `lib/ai/prompts.ts`) explicitly instruct Gemini to call tools before making any location-specific claim, to state exactly what's unavailable rather than guessing, and to ask for missing info (e.g. route origin/destination) instead of assuming it. Preserve this when editing prompts or adding tools.
- Structured engine outputs always include a live-data-status field so the UI can show whether weather/route/news were actually checked — don't drop that when changing `lib/safety/schemas.ts`.
- The `/bro` and recovery assistants require decisive, actionable output (e.g. go/delay/avoid/cancel/verify for route questions) — avoid making guidance vaguer when adjusting prompts.
