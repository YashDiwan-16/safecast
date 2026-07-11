# SafeCast AI Test Cases

This folder contains the current submission test cases for SafeCast AI. They are intentionally lightweight manual/API smoke tests so the repo stays small and no new test runner is required right before submission.

## Executable Tests

Run these from the repo root.

```bash
# Checks repo size and verifies ignored heavy/secret files are not tracked.
./test-cases/repo-hygiene-tests.mjs

# Requires the API server to be running at http://localhost:3000.
./test-cases/api-smoke-tests.mjs

# Runs both.
./test-cases/run-all-tests.sh
```

Optional environment variables:

```bash
SAFECAST_API_URL=http://localhost:3000 ./test-cases/api-smoke-tests.mjs
SAFECAST_MAX_REPO_BYTES=10485760 ./test-cases/repo-hygiene-tests.mjs
```

## Current Implemented Surface

| Area | Current implementation to test |
| --- | --- |
| Home/dashboard | Location input, language selector, emergency profile, three flow cards, compact assistant |
| Shared assistant UI | `SafeCastBot`, animated avatar states, speech input fallback, text-to-speech button, status chips |
| Before flow | `/preparedness` structured Gemini engine with live weather/map context |
| During flow | `/bro-chat` streaming Gemini assistant with tool calling |
| After flow | `/recovery` structured engine and `/recovery-chat` streaming recovery assistant |
| Live data | `/live-data`, OpenStreetMap Nominatim, Open-Meteo, Leaflet map |
| Route risk | OSRM routing plus Open-Meteo weather risk; live traffic explicitly unavailable |
| Emergency places | OpenStreetMap Overpass |
| Public updates | GDELT and Gemini Google Search grounding where used |
| AI fallback | Missing/invalid/quota-limited Gemini key returns clear unavailable messages |

## Test Environment

| Item | Value |
| --- | --- |
| Web app | `http://localhost:3001` |
| API server | `http://localhost:3000` |
| Required env | `VITE_SERVER_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, Gemini API key used by server AI config |
| External services | Gemini, Gemini Google Search grounding, Open-Meteo, OpenStreetMap Nominatim, OSRM, Overpass, GDELT |
| Test locations | Mumbai, Pune, Navi Mumbai, Thane |

## Priority Legend

| Priority | Meaning |
| --- | --- |
| P0 | Must pass for demo/submission |
| P1 | Important user flow |
| P2 | Nice to verify if time permits |

## Functional Test Cases

| ID | Priority | Area | Test Case | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- |
| TC-001 | P0 | Home | Home page loads with SafeCast AI positioning | Open `/` | Page shows SafeCast AI, monsoon safety intelligence messaging, location input, language selector, emergency profile CTA, Before/During/After cards, and compact assistant. |
| TC-002 | P0 | Navigation | Main cards route to real flows | Click Before Monsoon, During Monsoon `/bro`, and After Monsoon cards | Cards navigate to `/before`, `/bro`, and `/after` without dead links. |
| TC-003 | P0 | Live data | Valid location loads live context | Enter `Mumbai` and load live data | Live panel shows available map/weather/news context or clear unavailable states; no fake alert is displayed. |
| TC-004 | P0 | Live data | Invalid location fails honestly | Enter `asdf-not-a-real-place-12345` | UI shows map/location unavailable with reason from Nominatim; no fake coordinates. |
| TC-005 | P1 | Emergency profile | Save household profile locally | Open Emergency profile, fill name, contacts, needs, click Save | Success message says profile saved locally; data is stored in browser localStorage and can be read by `/bro` and recovery assistants. |
| TC-006 | P0 | Map | Leaflet map renders for valid location | Enter `Mumbai`; observe map section | Map renders with OpenStreetMap tiles and selected-location marker/circle. |
| TC-007 | P0 | Map fallback | Map unavailable state appears cleanly | Use invalid location or block network | UI shows `Live map unavailable` instead of empty/broken map. |
| TC-008 | P0 | Shared bot | SafeCastBot renders and accepts text | Open compact assistant or `/bro`; type a question | Bot shows user/assistant messages, working state while streaming, and does not crash. |
| TC-009 | P1 | Shared bot | Speech input fallback | Test in browser without SpeechRecognition support | UI shows speech fallback/unavailable chip or warning and typed input still works. |
| TC-010 | P1 | Shared bot | Status chips update from tool calls | Ask a query requiring weather/route/news | Chips show labels such as Weather checked, Route checked, News searched, Emergency places checked, Live data unavailable, or Emergency risk. |
| TC-011 | P1 | Shared bot | Text-to-speech control is safe | Click speak/volume control on assistant | Browser speaks short guidance if supported or remains usable if not supported. |
| TC-012 | P0 | Before flow | Preparedness plan with complete household profile | Go to `/before`; fill location, language, family, medical, pets, commute, contacts; submit | AI returns readiness score, priority actions, markdown plan, and live data status. |
| TC-013 | P0 | Before flow | Weather fallback is honest | Simulate weather failure/network block; submit preparedness | Output is marked without live weather context and does not invent live forecast details. |
| TC-014 | P1 | Before flow | Family-specific personalization | Enter elderly/children/medical needs/pets | Plan includes family-specific guidance and avoids generic-only output. |
| TC-015 | P1 | Before flow | Multilingual preparedness | Select Hindi/Marathi and submit | AI output is primarily in selected language. |
| TC-016 | P0 | During `/bro` | Missing route details ask clarification | Ask `/bro check if my route is safe` without origin/destination | Assistant asks for origin and destination instead of guessing. |
| TC-017 | P0 | During `/bro` | Route-risk question uses route/weather tools | Ask `/bro should I drive from Mumbai to Navi Mumbai today?` | Assistant provides go/delay/avoid/cancel/verify decision, route/weather context, and explicitly says live traffic is unavailable. |
| TC-018 | P1 | During `/bro` | Two-wheeler limitation is disclosed | Ask `/bro should I take my bike from Mumbai to Thane today?` | Route result discloses that OSRM has no dedicated two-wheeler profile and uses car route approximation. |
| TC-019 | P1 | During `/bro` | Transit limitation is disclosed | Ask `/bro should I take public transit from Mumbai to Pune?` | Assistant says OSRM public transit routing is unavailable and recommends checking local transit/official updates. |
| TC-020 | P0 | During `/bro` | Water entering home is urgent | Ask `/bro water is entering my house` | Assistant gives immediate safety steps, electrical precautions, who to notify, and what to do next. |
| TC-021 | P0 | During `/bro` | School bus delay is not invented | Ask `/bro my kid's school bus is delayed in Thane` | Assistant does not claim exact bus status; it gives verification and safety steps. |
| TC-022 | P1 | During `/bro` | Stuck in traffic avoids fake traffic | Ask `/bro I am stuck in traffic during heavy rain near Pune` | Assistant says live traffic is unavailable unless integrated and gives cautious guidance. |
| TC-023 | P1 | During `/bro` | Nearby emergency places are surfaced | Ask `/bro find nearby emergency places in Mumbai` | Tool output includes nearby OSM hospitals/clinics/police/fire/shelters or a clear unavailable reason. |
| TC-024 | P1 | During `/bro` | Same-language response | Ask a Hindi safety question | Assistant replies in Hindi or follows the selected language hint. |
| TC-025 | P0 | After structured flow | Recovery engine handles water damage | Go to `/after`; enter water damage, utilities status, medical needs; submit structured recovery form | Output includes danger assessment, sanitation, electrical hazards, documentation, services, and next 48 hours. |
| TC-026 | P0 | After chat flow | Recovery assistant streams guidance | Open After Monsoon recovery chat and ask `Water entered my home and there is a bad smell` | `/recovery-chat` streams markdown guidance with all required recovery sections. |
| TC-027 | P0 | After recovery | Fallen wire escalates | Ask recovery assistant about fallen electric wires | Output warns not to touch, advises distance/isolation, and says when to call emergency/electricity services. |
| TC-028 | P1 | After recovery | Drinking water contamination | Ask about muddy/contaminated drinking water | Output includes drinking water safety, sanitation, and disease prevention. |
| TC-029 | P1 | After recovery | Blocked road/clogged drain report | Ask about blocked road or clogged drain | Output includes community/local-authority report draft without inventing phone numbers or official names. |
| TC-030 | P0 | After recovery | Image scanning honesty | Ask if user can upload an image for risk scanning | Assistant says image upload/scanning is not implemented and does not pretend to inspect photos. |
| TC-031 | P0 | AI fallback | Missing Gemini key shows unavailable state | Run server without Gemini key and submit AI flow | API/UI return clear AI unavailable state and do not fake a plan. |
| TC-032 | P0 | AI fallback | Gemini quota/rate-limit error is user-friendly | Exhaust or simulate provider quota/rate-limit error | UI shows a clear Gemini quota/rate-limit unavailable message, not raw stack trace. |
| TC-033 | P0 | Safety honesty | No fake official alerts | Ask about official flood alert for a location | Assistant uses live search/tool context where available or says alerts are unavailable; it does not invent official warnings. |
| TC-034 | P0 | Safety honesty | No fake live traffic | Ask for traffic on a route | Output explicitly says live traffic is unavailable and does not claim road speed/traffic jams. |
| TC-035 | P1 | Markdown | AI markdown renders cleanly | Submit preparedness, `/bro`, or recovery chat | Headings, lists, and emphasis render cleanly without broken layout. |
| TC-036 | P1 | Responsive UI | Mobile layout works | Open app at mobile width | Cards, tabs, forms, bot panel, chat, and map remain usable without horizontal overflow. |
| TC-037 | P0 | Security | API keys are not exposed to browser | Inspect built client/network bundle | Gemini/server keys are not present in browser JS, localStorage, or client env. |
| TC-038 | P0 | Repo hygiene | Repo stays under submission size limit | Run `git ls-files -z \| xargs -0 du -ch \| tail -1` | Tracked repo contents remain below 10 MB; `node_modules`, `dist`, `.env`, and `.nx` are ignored. |

## API Smoke Test Cases

Run these after starting the backend at `http://localhost:3000`.

### TC-API-001: Health

```bash
curl -i http://localhost:3000/
```

Expected: HTTP 200 with body `OK`.

### TC-API-002: Live Data for Valid Location

```bash
curl "http://localhost:3000/live-data?location=Mumbai"
```

Expected: JSON response with live data objects. Weather/map/news may be available or unavailable, but unavailable states must include a reason.

### TC-API-003: Live Data for Invalid Location

```bash
curl "http://localhost:3000/live-data?location=asdf-not-a-real-place-12345"
```

Expected: JSON response with map/geocoding unavailable reason. No fake coordinates.

### TC-API-004: Preparedness Engine

```bash
curl -X POST http://localhost:3000/preparedness \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Mumbai",
    "language": "English",
    "houseType": "ground floor apartment",
    "floorLevel": "ground floor",
    "familyMembers": 4,
    "children": "one child age 8",
    "elderly": "one elderly parent",
    "pregnant": "",
    "disabledMembers": "",
    "medicalNeeds": "diabetes medicine",
    "pets": "one dog",
    "vehicleType": "car",
    "commutePattern": "daily office commute",
    "emergencyContacts": "local family and neighbor"
  }'
```

Expected: JSON engine response with Gemini output or explicit AI unavailable reason.

### TC-API-005: During Advisor Engine

```bash
curl -X POST http://localhost:3000/advisor \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Mumbai",
    "language": "English",
    "situation": "Water is entering my house and electricity is still on.",
    "riskTolerance": "low",
    "travelNeed": "none",
    "familyContext": "elderly parent at home"
  }'
```

Expected: Urgent safety response with immediate steps, avoid list, escalation signals, and local verification guidance.

### TC-API-006: Recovery Engine

```bash
curl -X POST http://localhost:3000/recovery \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Mumbai",
    "language": "English",
    "damage": "Water entered home, food spoiled, and there is stagnant water outside.",
    "utilitiesStatus": "electricity is off, water supply uncertain",
    "medicalNeeds": "elderly parent with diabetes"
  }'
```

Expected: Recovery guidance with immediate danger assessment, sanitation, water safety, documentation, services, and next 48 hours.

### TC-API-007: `/bro-chat` Streaming Route

```bash
curl -N -X POST http://localhost:3000/bro-chat \
  -H "Content-Type: application/json" \
  -d '{
    "language": "English",
    "location": "Mumbai",
    "profile": {"contacts":"neighbor and family"},
    "messages": [
      {
        "id": "test-bro-1",
        "role": "user",
        "parts": [
          {"type": "text", "text": "/bro should I drive from Mumbai to Navi Mumbai today?"}
        ]
      }
    ]
  }'
```

Expected: Streaming response when Gemini is configured, or HTTP 503 with AI unavailable payload when not configured.

### TC-API-008: `/recovery-chat` Streaming Route

```bash
curl -N -X POST http://localhost:3000/recovery-chat \
  -H "Content-Type: application/json" \
  -d '{
    "language": "English",
    "location": "Mumbai",
    "profile": {"medicalNeeds":"elderly parent with diabetes"},
    "messages": [
      {
        "id": "test-recovery-1",
        "role": "user",
        "parts": [
          {"type": "text", "text": "Water entered my home and my drinking water looks muddy."}
        ]
      }
    ]
  }'
```

Expected: Streaming recovery guidance with the required recovery sections, or HTTP 503 with AI unavailable payload when not configured.

### TC-API-009: General `/chat` Streaming Route

```bash
curl -N -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "language": "English",
    "mode": "general monsoon safety",
    "location": "Mumbai",
    "messages": [
      {
        "id": "test-chat-1",
        "role": "user",
        "parts": [
          {"type": "text", "text": "What should my family prepare this week?"}
        ]
      }
    ]
  }'
```

Expected: Streaming assistant response with tool use for live claims, or HTTP 503 with AI unavailable payload when not configured.

## Demo Pass Checklist

- [ ] Home page loads and looks like a civic safety product.
- [ ] Before flow generates a personalized preparedness plan.
- [ ] `/bro` handles a route/safety question and discloses traffic limitations.
- [ ] After structured recovery flow generates guidance.
- [ ] After recovery chat streams guidance through `SafeCastBot`.
- [ ] SafeCastBot status chips show weather/route/news/live-data states.
- [ ] Map renders for a known location.
- [ ] Invalid location shows unavailable state.
- [ ] Transit/two-wheeler OSRM limitations are disclosed.
- [ ] App never claims live traffic unless a traffic API is integrated.
- [ ] App never invents official alerts or phone numbers.
- [ ] App does not claim image scanning is implemented.
- [ ] Gemini missing/quota errors show friendly unavailable messages.
- [ ] API keys remain server-only.
- [ ] GitHub tracked size remains below 10 MB.
