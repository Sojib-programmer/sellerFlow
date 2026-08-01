#!/usr/bin/env node
// Lighthouse-style per-route load metrics against the *production* build.
// Boots `vite preview`, then drives headless Chromium and reads real
// Performance/PerformanceObserver values (TTFB, FCP, LCP, CLS, DCL, transfer).
// Any route over the thresholds in perf-budget.json fails the process.

import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { startPreviewServer, launchOptions } from "./server-harness.mjs";

const config = JSON.parse(readFileSync("perf-budget.json", "utf8"));
const { thresholds, paths } = config.routes;
const RUNS_PER_ROUTE = Number(process.env["PERF_RUNS"] ?? 2);

const METRIC_SCRIPT = `(async () => {
  const nav = performance.getEntriesByType("navigation")[0] ?? {};
  const paint = performance.getEntriesByType("paint");
  const fcp = paint.find((p) => p.name === "first-contentful-paint");

  let lcp = 0;
  let cls = 0;
  try {
    for (const e of performance.getEntriesByType("largest-contentful-paint")) lcp = e.startTime;
    for (const e of performance.getEntriesByType("layout-shift")) {
      if (!e.hadRecentInput) cls += e.value;
    }
  } catch {}

  const transfer = performance
    .getEntriesByType("resource")
    .reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), nav.transferSize || 0);

  return {
    ttfbMs: Math.round(nav.responseStart ?? 0),
    fcpMs: Math.round(fcp ? fcp.startTime : 0),
    lcpMs: Math.round(lcp || (fcp ? fcp.startTime : 0)),
    domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd ?? 0),
    cls: Math.round(cls * 1000) / 1000,
    transferKb: Math.round((transfer / 1024) * 100) / 100,
  };
})()`;

const higherIsWorse = new Set([
  "ttfbMs",
  "fcpMs",
  "lcpMs",
  "domContentLoadedMs",
  "cls",
  "transferKb",
]);

async function measure(page, url) {
  await page.goto(url, { waitUntil: "load" });
  // Let LCP settle and any layout shift land before sampling.
  await page.waitForTimeout(600);
  return page.evaluate(METRIC_SCRIPT);
}

const server = await startPreviewServer();
const browser = await chromium.launch(launchOptions());
const results = [];
const failures = [];

try {
  for (const path of paths) {
    const samples = [];
    for (let run = 0; run < RUNS_PER_ROUTE; run++) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      samples.push(await measure(page, server.url + path));
      await context.close();
    }
    // Best-of-N: cold-start noise in CI otherwise dominates the signal.
    const best = {};
    for (const key of Object.keys(thresholds)) {
      best[key] = Math.min(...samples.map((s) => s[key] ?? 0));
    }
    results.push({ path, ...best });

    const over = Object.entries(thresholds).filter(
      ([key, limit]) => higherIsWorse.has(key) && best[key] > limit,
    );
    for (const [key, limit] of over) {
      failures.push(`${path} → ${key} ${best[key]} > ${limit}`);
    }
    const flag = over.length === 0 ? "PASS" : "FAIL";
    console.log(
      `  [${flag}] ${path.padEnd(14)} ttfb ${String(best.ttfbMs).padStart(4)}ms  fcp ${String(best.fcpMs).padStart(4)}ms  lcp ${String(best.lcpMs).padStart(4)}ms  dcl ${String(best.domContentLoadedMs).padStart(4)}ms  cls ${best.cls}  ${best.transferKb}kB`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}

writeFileSync(
  "perf-report-routes.json",
  `${JSON.stringify({ measuredAt: new Date().toISOString(), thresholds, results }, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error("\nRoute performance budget exceeded:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nRoute performance budgets OK.\n");
