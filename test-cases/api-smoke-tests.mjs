#!/usr/bin/env node

const baseUrl = (process.env.SAFECAST_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const timeoutMs = Number(process.env.SAFECAST_TEST_TIMEOUT_MS ?? 45000);

let failures = 0;
let warnings = 0;

function pass(name) {
  console.log(`[PASS] ${name}`);
}

function fail(name, error) {
  failures += 1;
  console.error(`[FAIL] ${name}`);
  console.error(`       ${error instanceof Error ? error.message : String(error)}`);
}

function warn(message) {
  warnings += 1;
  console.warn(`[WARN] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function jsonRequest(path, options = {}) {
  const response = await fetchWithTimeout(path, options);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 240)}`);
  }
  return { response, json };
}

async function postJson(path, body) {
  return jsonRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function assertLiveResult(value, label) {
  assert(isObject(value), `${label} should be an object`);
  assert(value.status === "available" || value.status === "unavailable", `${label} has invalid status`);
  assert(typeof value.source === "string" && value.source.length > 0, `${label} should include source`);
  assert(typeof value.fetchedAt === "string" && value.fetchedAt.length > 0, `${label} should include fetchedAt`);
  if (value.status === "unavailable") {
    assert(typeof value.reason === "string" && value.reason.length > 0, `${label} unavailable result needs reason`);
  }
}

function assertEngineResult(value, label) {
  assert(isObject(value), `${label} response should be an object`);
  assert(isObject(value.live), `${label} should include live context`);
  assert(isObject(value.ai), `${label} should include ai result`);
  assert(value.ai.status === "available" || value.ai.status === "unavailable", `${label} ai status is invalid`);
  if (value.ai.status === "available") {
    assert(isObject(value.ai.output), `${label} available ai result should include output`);
    assert(value.ai.model === "Gemini", `${label} should identify Gemini model`);
  } else {
    assert(typeof value.ai.reason === "string" && value.ai.reason.length > 0, `${label} unavailable ai needs reason`);
  }
}

async function run(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

const preparednessPayload = {
  location: "Mumbai",
  language: "English",
  houseType: "ground floor apartment",
  floorLevel: "ground floor",
  familyMembers: 4,
  children: "one child age 8",
  elderly: "one elderly parent",
  pregnant: "",
  disabledMembers: "",
  medicalNeeds: "diabetes medicine",
  pets: "one dog",
  vehicleType: "car",
  commutePattern: "daily office commute",
  emergencyContacts: "local family and neighbor",
};

const advisorPayload = {
  location: "Mumbai",
  language: "English",
  situation: "Water is entering my house and electricity is still on.",
  indoors: true,
  waterLevel: "ankle level",
};

const recoveryPayload = {
  location: "Mumbai",
  language: "English",
  damage: "Water entered home, food spoiled, and there is stagnant water outside.",
  utilitiesStatus: "electricity is off, water supply uncertain",
  medicalNeeds: "elderly parent with diabetes",
};

function uiMessage(id, text) {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
  };
}

async function assertStreamingOrUnavailable(path, payload, label) {
  const response = await fetchWithTimeout(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 503) {
    const json = await response.json();
    assert(isObject(json.error), `${label} 503 should include error payload`);
    assert(json.error.status === "unavailable", `${label} 503 error should be unavailable`);
    return;
  }

  assert(response.ok, `${label} expected 200 stream or 503 unavailable, got ${response.status}`);
  const text = await response.text();
  assert(text.length > 0, `${label} stream should not be empty`);
}

console.log(`SafeCast API smoke tests against ${baseUrl}`);

await run("TC-API-001 health endpoint", async () => {
  const response = await fetchWithTimeout("/");
  const text = await response.text();
  assert(response.ok, `Expected HTTP 200, got ${response.status}`);
  assert(text.trim() === "OK", `Expected OK body, got ${text}`);
});

await run("TC-API-002 live data for valid location", async () => {
  const { response, json } = await jsonRequest("/live-data?location=Mumbai");
  assert(response.ok, `Expected HTTP 200, got ${response.status}`);
  assert(json.locationQuery === "Mumbai", "locationQuery should echo request");
  assertLiveResult(json.map, "map");
  assertLiveResult(json.weather, "weather");
  assertLiveResult(json.updates, "updates");
  if (json.map.status === "unavailable") {
    warn(`Mumbai map lookup unavailable during smoke test: ${json.map.reason}`);
  }
});

await run("TC-API-003 live data for invalid location", async () => {
  const { response, json } = await jsonRequest("/live-data?location=asdf-not-a-real-place-12345");
  assert(response.ok, `Expected HTTP 200, got ${response.status}`);
  assertLiveResult(json.map, "map");
  assert(json.map.status === "unavailable", "invalid location should not return fake map coordinates");
});

await run("TC-API-004 preparedness engine", async () => {
  const { response, json } = await postJson("/preparedness", preparednessPayload);
  assert(response.ok, `Expected HTTP 200, got ${response.status}`);
  assertEngineResult(json, "preparedness");
});

await run("TC-API-005 during advisor engine", async () => {
  const { response, json } = await postJson("/advisor", advisorPayload);
  assert(response.ok, `Expected HTTP 200, got ${response.status}`);
  assertEngineResult(json, "advisor");
});

await run("TC-API-006 recovery engine", async () => {
  const { response, json } = await postJson("/recovery", recoveryPayload);
  assert(response.ok, `Expected HTTP 200, got ${response.status}`);
  assertEngineResult(json, "recovery");
});

await run("TC-API-007 /bro-chat stream or AI unavailable", async () => {
  await assertStreamingOrUnavailable(
    "/bro-chat",
    {
      language: "English",
      location: "Mumbai",
      profile: { contacts: "neighbor and family" },
      messages: [uiMessage("test-bro-1", "/bro should I drive from Mumbai to Navi Mumbai today?")],
    },
    "/bro-chat",
  );
});

await run("TC-API-008 /recovery-chat stream or AI unavailable", async () => {
  await assertStreamingOrUnavailable(
    "/recovery-chat",
    {
      language: "English",
      location: "Mumbai",
      profile: { medicalNeeds: "elderly parent with diabetes" },
      messages: [uiMessage("test-recovery-1", "Water entered my home and my drinking water looks muddy.")],
    },
    "/recovery-chat",
  );
});

await run("TC-API-009 /chat stream or AI unavailable", async () => {
  await assertStreamingOrUnavailable(
    "/chat",
    {
      language: "English",
      mode: "general monsoon safety",
      location: "Mumbai",
      messages: [uiMessage("test-chat-1", "What should my family prepare this week?")],
    },
    "/chat",
  );
});

if (failures > 0) {
  console.error(`\n${failures} API smoke test(s) failed. ${warnings} warning(s).`);
  console.error("Make sure the API server is running, for example: pnpm run dev:server");
  process.exit(1);
}

console.log(`\nAll API smoke tests passed. ${warnings} warning(s).`);
