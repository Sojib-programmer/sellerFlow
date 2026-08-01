#!/usr/bin/env node
// Bundle-size regression guard. Walks the client build output, gzips every asset
// and compares the totals against perf-budget.json. Exits non-zero on regression.
//
//   bun run perf:budget            # check against committed budgets
//   bun run perf:budget --update   # rewrite budgets from the current build

import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CONFIG_PATH = "perf-budget.json";
const HEADROOM = 1.1; // 10% slack when seeding budgets
const UPDATE = process.argv.includes("--update");

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const clientDir = config.bundle.clientDir;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let files;
try {
  files = walk(clientDir);
} catch {
  console.error(`perf-budget: ${clientDir} not found — run \`bun run build\` first.`);
  process.exit(1);
}

const kb = (bytes) => Math.round((bytes / 1024) * 100) / 100;

const assets = files
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => {
    const raw = readFileSync(f);
    return {
      file: relative(clientDir, f),
      kind: f.endsWith(".css") ? "css" : "js",
      rawKb: kb(raw.length),
      gzipKb: kb(gzipSync(raw).length),
    };
  })
  .sort((a, b) => b.gzipKb - a.gzipKb);

if (assets.length === 0) {
  console.error("perf-budget: no js/css assets found in the client build output.");
  process.exit(1);
}

const js = assets.filter((a) => a.kind === "js");
const css = assets.filter((a) => a.kind === "css");
const sum = (list) => Math.round(list.reduce((n, a) => n + a.gzipKb, 0) * 100) / 100;

// The largest JS asset is the shared framework/entry chunk every route pays for.
const entry = js[0];

const measured = {
  totalJsGzipKb: sum(js),
  totalCssGzipKb: sum(css),
  largestChunkGzipKb: entry.gzipKb,
  entryGzipKb: entry.gzipKb,
};

console.log(`\nClient bundle (${assets.length} assets, gzipped)\n`);
for (const a of assets.slice(0, 15)) {
  console.log(`  ${a.gzipKb.toFixed(2).padStart(8)} kB  ${a.file}  (raw ${a.rawKb} kB)`);
}
if (assets.length > 15) console.log(`  … ${assets.length - 15} smaller assets`);
console.log("");

if (UPDATE || !config.bundle.totalJsGzipKb) {
  for (const [key, value] of Object.entries(measured)) {
    config.bundle[key] = Math.ceil(value * HEADROOM);
  }
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  console.log("Budgets written to perf-budget.json:");
  for (const [key, value] of Object.entries(measured)) {
    console.log(`  ${key}: measured ${value} kB → budget ${config.bundle[key]} kB`);
  }
  process.exit(0);
}

const failures = [];
for (const [key, value] of Object.entries(measured)) {
  const budget = config.bundle[key];
  const status = value <= budget ? "PASS" : "FAIL";
  if (status === "FAIL") failures.push(`${key}: ${value} kB > budget ${budget} kB`);
  const pct = Math.round((value / budget) * 100);
  console.log(`  [${status}] ${key.padEnd(20)} ${String(value).padStart(8)} / ${budget} kB (${pct}%)`);
}
console.log("");

writeFileSync(
  "perf-report-bundle.json",
  `${JSON.stringify({ measuredAt: new Date().toISOString(), measured, budgets: config.bundle, assets }, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error("Bundle budget exceeded:");
  for (const f of failures) console.error(`  - ${f}`);
  console.error("\nReduce the bundle, or run `bun run perf:budget --update` if the growth is intentional.");
  process.exit(1);
}
console.log("Bundle budgets OK.\n");
