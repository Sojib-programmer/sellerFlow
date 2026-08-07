#!/usr/bin/env node
// Production smoke suite. Runs every route across four viewports against the
// production build and FAILS on:
//   - any console error or uncaught page error
//   - any failed network request (4xx/5xx) for a same-origin asset
//   - responsive chrome regressions (sidebar >=1024px, bottom nav <1024px)
//   - serious/critical axe-core accessibility violations
//   - keyboard-navigation regressions in the sidebar / bottom sheet
//
//   bun run test:smoke

import { mkdirSync, writeFileSync } from "node:fs";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import { startPreviewServer, launchOptions } from "../scripts/server-harness.mjs";
import { applySession, getTestSession } from "../scripts/test-session.mjs";

const ARTIFACTS = "test-artifacts";
const SCREENSHOTS = `${ARTIFACTS}/screenshots`;

// Public routes render for anyone. Gated routes live under the _authenticated
// layout and redirect to /auth without a session, so they need a real session
// injected before navigation — otherwise this suite would silently be testing
// the sign-in page ten times over.
const PUBLIC_ROUTES = ["/", "/auth"];
const GATED_ROUTES = [
  "/dashboard",
  "/orders",
  "/orders/new",
  "/inbox",
  "/products",
  "/couriers",
  "/analytics",
  "/settings",
  "/diagnostics",
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, sidebar: false },
  { name: "tablet", width: 768, height: 1024, sidebar: false },
  { name: "laptop", width: 1280, height: 900, sidebar: true },
  { name: "desktop", width: 1680, height: 1050, sidebar: true },
];


// Narrow, explicit allowlist — never a broad regex that could hide real bugs.
const ALLOWED_CONSOLE = [
  "Download the React DevTools",
  "[vite] connected",
];

const failures = [];
const axeReport = [];
const fail = (message) => {
  failures.push(message);
  console.log(`  FAIL  ${message}`);
};

mkdirSync(SCREENSHOTS, { recursive: true });

function attachDiagnostics(page, label) {
  const problems = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ALLOWED_CONSOLE.some((allowed) => text.includes(allowed))) return;
    problems.push(`console.error: ${text}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().startsWith(page.context()._smokeOrigin ?? "http")) {
      problems.push(`http ${res.status()} ${res.url()}`);
    }
  });
  return { label, problems };
}

async function checkResponsiveChrome(page, viewport, route) {
  const sidebar = page.locator('aside[data-testid="app-sidebar"]');
  const bottomNav = page.locator('nav[data-testid="app-bottom-nav"]');
  // Public routes render outside the app shell.
  if (PUBLIC_ROUTES.includes(route)) return;


  const sidebarVisible = await sidebar.isVisible();
  const bottomVisible = await bottomNav.isVisible();

  if (viewport.sidebar && !sidebarVisible) {
    fail(`${route} @${viewport.name}: desktop sidebar should be visible`);
  }
  if (!viewport.sidebar && sidebarVisible) {
    fail(`${route} @${viewport.name}: desktop sidebar should be hidden`);
  }
  if (viewport.sidebar && bottomVisible) {
    fail(`${route} @${viewport.name}: bottom nav should be hidden`);
  }
  if (!viewport.sidebar && !bottomVisible) {
    fail(`${route} @${viewport.name}: bottom nav should be visible`);
  }
}

async function checkAxe(page, route, viewportName) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );
  axeReport.push({
    route,
    viewport: viewportName,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
    })),
  });
  for (const v of serious) {
    fail(`${route} @${viewportName}: axe ${v.id} (${v.impact}, ${v.nodes.length} node(s)) — ${v.help}`);
  }
}

async function checkKeyboardSidebar(page) {
  // Skip link must be the first focusable element and must move focus to main.
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  if (!/skip to content/i.test(first)) {
    fail(`/dashboard: first Tab stop should be the skip link, got "${first}"`);
  }

  // Every sidebar link must be reachable by keyboard and expose an accessible name.
  const links = page.locator('aside[data-testid="app-sidebar"] a');
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    await link.focus();
    const focused = await link.evaluate((el) => el === document.activeElement);
    if (!focused) fail(`/dashboard: sidebar link #${i} is not focusable`);
    const name = (await link.getAttribute("aria-label")) ?? (await link.innerText());
    if (!name.trim()) fail(`/dashboard: sidebar link #${i} has no accessible name`);
  }

  // Exactly one nav item may be the current page.
  const current = await page
    .locator('aside[data-testid="app-sidebar"] a[aria-current="page"]')
    .count();
  if (current !== 1) {
    fail(`/dashboard: expected exactly 1 aria-current="page" in sidebar, found ${current}`);
  }
}

async function checkBottomSheet(page) {
  const trigger = page.getByRole("button", { name: /more navigation/i });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });

  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    fail("bottom sheet: trigger should report aria-expanded=true when open");
  }

  // Focus must move into the sheet, not stay on the trigger behind the overlay.
  const focusInside = await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"]');
    return !!dialogEl && dialogEl.contains(document.activeElement);
  });
  if (!focusInside) fail("bottom sheet: focus was not moved into the dialog");

  // Escape must close it and restore focus to the trigger.
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  const restored = await trigger.evaluate((el) => el === document.activeElement);
  if (!restored) fail("bottom sheet: focus was not restored to the trigger after Escape");

  // Reopen and confirm the links inside are keyboard-activatable.
  await page.keyboard.press("Enter");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  const sheetLinks = await page.locator('[role="dialog"] a').count();
  if (sheetLinks === 0) fail("bottom sheet: no navigation links found inside the sheet");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
}

const server = await startPreviewServer();
const browser = await chromium.launch(launchOptions());

try {
  for (const viewport of VIEWPORTS) {
    console.log(`\n=== ${viewport.name} (${viewport.width}x${viewport.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    context._smokeOrigin = server.url;

    for (const route of ROUTES) {
      const page = await context.newPage();
      const diag = attachDiagnostics(page, `${route} @${viewport.name}`);
      const response = await page.goto(server.url + route, { waitUntil: "networkidle" });

      if (!response || response.status() >= 400) {
        fail(`${route} @${viewport.name}: HTTP ${response?.status() ?? "no response"}`);
      }

      await checkResponsiveChrome(page, viewport, route);
      await checkAxe(page, route, viewport.name);

      if (route === "/dashboard") {
        if (viewport.sidebar) await checkKeyboardSidebar(page);
        else await checkBottomSheet(page);
      }

      await page.screenshot({
        path: `${SCREENSHOTS}/${viewport.name}${route.replace(/\//g, "_") || "_root"}.png`,
      });

      for (const problem of diag.problems) fail(`${diag.label}: ${problem}`);
      if (diag.problems.length === 0) console.log(`  ok    ${route}`);
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

writeFileSync(`${ARTIFACTS}/axe-report.json`, `${JSON.stringify(axeReport, null, 2)}\n`);

console.log("");
if (failures.length > 0) {
  console.error(`Smoke suite failed with ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Smoke suite passed: ${ROUTES.length} routes x ${VIEWPORTS.length} viewports, zero console errors, zero serious axe violations.\n`,
);
