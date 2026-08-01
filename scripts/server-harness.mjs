// Shared harness: boots the production build behind `vite preview` and resolves
// Chromium launch options. Local sandboxes ship a pre-installed browser at a
// version Playwright's own resolver doesn't know about, so CHROMIUM_PATH wins
// when present; CI relies on `playwright install chromium`.

import { spawn } from "node:child_process";

const PORT = Number(process.env["PERF_PORT"] ?? 4180);
const HOST = "127.0.0.1";
const BOOT_TIMEOUT_MS = 60_000;

export function launchOptions() {
  const executablePath = process.env["CHROMIUM_PATH"];
  return {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(executablePath ? { executablePath } : {}),
  };
}

async function waitForServer(url) {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server did not become ready at ${url}`);
}

export async function startPreviewServer() {
  const external = process.env["PREVIEW_URL"];
  if (external) {
    await waitForServer(external);
    return { url: external.replace(/\/$/, ""), close: async () => {} };
  }

  const child = spawn(
    "npx",
    ["vite", "preview", "--port", String(PORT), "--host", HOST, "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"], env: process.env },
  );
  const bootLogs = [];
  child.stdout.on("data", (d) => bootLogs.push(String(d)));
  child.stderr.on("data", (d) => bootLogs.push(String(d)));

  const previewUrl = `http://${HOST}:${PORT}`;
  try {
    await waitForServer(previewUrl);
    return {
      url: previewUrl,
      close: async () => {
        child.kill("SIGKILL");
        await new Promise((r) => setTimeout(r, 200));
      },
    };
  } catch {
    // The Worker-targeted nitro output is not servable by `vite preview` in this
    // template, so fall back to an already-running app server (dev server locally,
    // `bun run dev` in CI). Set PREVIEW_URL to target a deployed build instead.
    child.kill("SIGKILL");
    const fallback = process.env["FALLBACK_URL"] ?? "http://localhost:8080";
    console.log(`(vite preview unavailable — using ${fallback})`);
    await waitForServer(fallback);
    return { url: fallback, close: async () => {} };
  }
}
