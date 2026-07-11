# SafeCast AI Test Cases

This folder contains the submission-ready test cases for SafeCast AI. These are written as manual and API smoke tests so they can be executed quickly during hackathon review without adding a new test runner or increasing repo size.

## Test Environment

| Item | Value |
| --- | --- |
| Web app | `http://localhost:3001` |
| API server | `http://localhost:3000` |
| Required env | `VITE_SERVER_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, Gemini API key used by server AI config |
| External services | Gemini, Open-Meteo, OpenStreetMap Nominatim, OSRM, Overpass, GDELT |
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
| TC-001 | P0 | Home | Home page loads with SafeCast AI positioning | Open `/` | Page shows SafeCast AI, monsoon safety intelligence messaging, location input, language selector, emergency profile CTA, and Before/During/After entry cards. |
| TC-002 | P0 | Navigation | Entry cards route to real flows | Click Before Monsoon, During Monsoon `/bro`, and After Monsoon cards | Cards navigate to `/before`, `/bro`, and `/after` without dead links. |
| TC-003 | P0 | Live data | Valid location loads live context | Enter `Mumbai` and refresh/search live data | Live panel shows available map/weather context or a clear unavailable state; no fake alert is displayed. |
| TC-004 | P0 | Live data | Invalid location fails honestly | Enter `asdf-not-a-real-place-12345` | UI shows live map/location unavailable with reason from lookup failure. |
| TC-005 | P1 | Emergency profile | Save household profile locally | Open Emergency profile, fill name, contacts, needs, click Save | Success message says profile saved locally; data is stored in browser localStorage, not sent to server. |
| TC-006 | P0 | Map | Leaflet map renders for valid location | Enter `Mumbai`; observe map section | Map renders with OpenStreetMap tiles and marker/circle for selected location. |
| TC-007 | P0 | Map fallback | Map unavailable state appears cleanly | Use invalid location or block network | UI shows `Live map unavailable` instead of empty/broken map. |
| TC-008 | P0 | Before flow | Preparedness plan with complete household profile | Go to `/before`; fill location, language, family, medical, pets, commute, contacts; submit | AI returns readiness score, priority actions, checklist-style markdown, and live data status. |
| TC-009 | P0 | Before flow | Weather fallback is honest | Simulate weather API failure or use network block; submit preparedness flow | Output is marked without live weather context and still gives general preparedness guidance. |
| TC-010 | P1 | Before flow | Family-specific personalization | Enter elderly/children/medical needs/pets in profile | Plan includes family-specific guidance and does not return generic-only content. |
| TC-011 | P1 | Before flow | Multilingual preparedness | Select Hindi or Marathi and submit | AI output is primarily in selected language. |
| TC-012 | P0 | During `/bro` | Route question with missing details asks for clarification | Ask `/bro check if my route is safe` without origin/destination | Assistant asks for missing origin and destination instead of guessing. |
| TC-013 | P0 | During `/bro` | Route-risk question uses route and weather tools | Ask `/bro should I drive from Mumbai to Navi Mumbai today?` | Assistant provides go/delay/avoid/cancel/verify decision, route/weather context, and says live traffic is unavailable if not checked. |
| TC-014 | P0 | During `/bro` | Water entering home is treated as urgent | Ask `/bro water is entering my house` | Assistant gives immediate safety steps, electrical precautions, who to notify, and next action. |
| TC-015 | P0 | During `/bro` | School bus delay is not invented | Ask `/bro my kid's school bus is delayed in Thane` | Assistant does not claim exact bus status; it gives verification steps and safety guidance. |
| TC-016 | P1 | During `/bro` | Stuck in traffic query avoids fake traffic | Ask `/bro I am stuck in traffic during heavy rain near Pune` | Assistant says live traffic is unavailable unless traffic API is integrated; gives cautious safety advice. |
| TC-017 | P1 | During `/bro` | Nearby emergency places are surfaced | Ask `/bro find nearby emergency places in Mumbai` | Tool output includes nearby hospitals/clinics/police/fire/shelters from OpenStreetMap or an unavailable reason. |
| TC-018 | P1 | During `/bro` | Same-language response | Ask a Hindi safety question | Assistant replies in Hindi or clearly follows the selected language hint. |
| TC-019 | P1 | During `/bro` | Speech fallback | Test in browser without speech recognition support | UI shows speech input unavailable and allows typed input. |
| TC-020 | P0 | After flow | Recovery guidance for water entered home | Go to `/after`; enter water damage, utilities status, medical needs; submit | Output includes danger assessment, sanitation, electrical hazards, documentation, and follow-up steps. |
| TC-021 | P0 | After flow | Fallen wire scenario escalates | Enter `fallen electric wire near house` | Output warns not to touch, advises distance/isolation, and says to contact emergency/electricity services. |
| TC-022 | P1 | After flow | Drinking water contamination | Enter contaminated drinking water issue | Output includes boil/filter/avoid guidance and disease prevention steps. |
| TC-023 | P1 | After flow | Authority report draft | Enter clogged drain or blocked road | Output includes a usable local authority/community report draft or reporting guidance. |
| TC-024 | P0 | AI fallback | Missing Gemini key shows unavailable state | Run server without Gemini key and submit AI flow | API returns AI unavailable state; UI shows clear error and does not fake a plan. |
| TC-025 | P0 | Safety honesty | No fake alerts | Ask about official flood alert for a location | Assistant uses live search/tool context where available or says public alerts are unavailable; it does not invent official warnings. |
| TC-026 | P0 | Source/status chips | Live status is visible | Run Before/During/After flows | UI shows live data status such as weather checked, route checked, news searched, or live data unavailable. |
| TC-027 | P1 | Markdown | AI output renders markdown correctly | Submit preparedness or recovery flow | Headings, lists, and emphasis render cleanly without raw markdown artifacts breaking layout. |
| TC-028 | P1 | Responsive UI | Mobile layout works | Open app at mobile width | Cards, tabs, forms, bot panel, and map remain usable without horizontal overflow. |
| TC-029 | P0 | Security | API keys are not exposed to browser | Inspect built client/network bundle | Gemini/server keys are not present in browser JS, localStorage, or client environment. |
| TC-030 | P0 | Repo hygiene | Repo stays under submission size limit | Run `git ls-files -z \| xargs -0 du -ch \| tail -1` | Tracked repo contents remain below 10 MB; `node_modules`, `dist`, `.env`, and `.nx` are ignored. |

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

Expected: JSON response with live data objects. Weather/map may be available or unavailable, but unavailable states must include a reason.

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

Expected: JSON engine response with AI output or an explicit AI unavailable reason.

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

## Demo Pass Checklist

- [ ] Home page loads and looks like a civic safety product.
- [ ] Before flow generates a personalized preparedness plan.
- [ ] `/bro` handles at least one route/safety question.
- [ ] After flow generates recovery guidance.
- [ ] Map renders for a known location.
- [ ] Invalid location shows unavailable state.
- [ ] App never claims live traffic unless a traffic API is integrated.
- [ ] App never invents official alerts.
- [ ] API keys remain server-only.
- [ ] GitHub tracked size remains below 10 MB.
