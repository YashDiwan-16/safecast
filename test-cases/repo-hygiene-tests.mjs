#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

const maxBytes = Number(process.env.SAFECAST_MAX_REPO_BYTES ?? 10 * 1024 * 1024);
const blockedPatterns = [
  /^node_modules\//,
  /\/node_modules\//,
  /^\.env$/,
  /\/\.env$/,
  /^\.env\.(?!example$)/,
  /\/\.env\.(?!example$)/,
  /^dist\//,
  /\/dist\//,
  /^build\//,
  /\/build\//,
  /^\.nx\//,
  /^apps\/web\/\.tanstack\//,
  /^apps\/web\/src\/routeTree\.gen\.ts$/,
];

let failures = 0;

function pass(name) {
  console.log(`[PASS] ${name}`);
}

function fail(name, message) {
  failures += 1;
  console.error(`[FAIL] ${name}`);
  console.error(`       ${message}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

const repoRoot = git(["rev-parse", "--show-toplevel"]).trim();
const trackedFiles = git(["ls-files", "-z"]).split("\0").filter(Boolean);

let totalBytes = 0;
const largest = [];

for (const file of trackedFiles) {
  const size = statSync(resolve(repoRoot, file)).size;
  totalBytes += size;
  largest.push({ file, size });
}

largest.sort((a, b) => b.size - a.size);

if (totalBytes <= maxBytes) {
  pass(`tracked repository size is ${formatBytes(totalBytes)} <= ${formatBytes(maxBytes)}`);
} else {
  fail(
    "tracked repository size",
    `Tracked files total ${formatBytes(totalBytes)}, which exceeds ${formatBytes(maxBytes)}.`,
  );
}

const blockedTrackedFiles = trackedFiles.filter((file) => blockedPatterns.some((pattern) => pattern.test(file)));
if (blockedTrackedFiles.length === 0) {
  pass("no heavy, generated, or secret-like files are tracked");
} else {
  fail("blocked tracked files", `Remove from git: ${blockedTrackedFiles.join(", ")}`);
}

const topFive = largest.slice(0, 5).map(({ file, size }) => `${formatBytes(size)} ${file}`).join("\n       ");
console.log(`[INFO] largest tracked files:\n       ${topFive}`);

if (failures > 0) {
  console.error(`\n${failures} repo hygiene test(s) failed.`);
  process.exit(1);
}

console.log("\nAll repo hygiene tests passed.");
