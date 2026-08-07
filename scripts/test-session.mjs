// Shared test-session bootstrap for the Playwright suites and the RLS script.
//
// Everything here uses the publishable (anon) key only, so the sessions it
// produces are exactly the sessions a real browser would hold. The service role
// key is never read.
import { readFileSync } from "node:fs";

const strip = (value) => value.replace(/^["']|["']$/g, "");

export function loadEnv(file = ".env") {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) process.env[match[1]] = strip(match[2]);
    }
  } catch {
    /* env supplied by the runner */
  }
}

export function supabaseEnv() {
  loadEnv();
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const projectId =
    process.env["SUPABASE_PROJECT_ID"] ??
    process.env["VITE_SUPABASE_PROJECT_ID"] ??
    (url ? new URL(url).host.split(".")[0] : undefined);
  return { url, key, projectId };
}

export function storageKey() {
  const { projectId } = supabaseEnv();
  return `sb-${projectId}-auth-token`;
}

async function authFetch(path, body) {
  const { url, key } = supabaseEnv();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

/**
 * Returns a real Supabase session for the smoke suite, or null with a reason.
 *
 * Order of preference:
 *   1. SMOKE_EMAIL / SMOKE_PASSWORD  (a durable test account — best for CI)
 *   2. an ad-hoc signup              (only works when email confirmation is off)
 */
export async function getTestSession({ storeName = "Smoke Test Store" } = {}) {
  const { url, key } = supabaseEnv();
  if (!url || !key) return { session: null, reason: "Supabase env vars missing" };

  const email = process.env["SMOKE_EMAIL"];
  const password = process.env["SMOKE_PASSWORD"];

  if (email && password) {
    const signIn = await authFetch("token?grant_type=password", { email, password });
    if (signIn.ok && signIn.json?.access_token) {
      return { session: signIn.json, email, created: false };
    }
    return {
      session: null,
      reason: `SMOKE_EMAIL sign-in failed: ${signIn.json?.error_description ?? signIn.json?.msg ?? signIn.status}`,
    };
  }

  const adHocEmail = `smoke-${Date.now()}@example.com`;
  const adHocPassword = `Smoke-${Date.now()}!a`;
  const signUp = await authFetch("signup", {
    email: adHocEmail,
    password: adHocPassword,
    data: { store_name: storeName },
  });

  if (signUp.ok && signUp.json?.access_token) {
    return { session: signUp.json, email: adHocEmail, created: true };
  }

  const reason =
    signUp.json?.error_description ??
    signUp.json?.msg ??
    signUp.json?.message ??
    `signup failed with ${signUp.status}`;
  const hint = /rate limit|confirm/i.test(String(reason))
    ? " (email confirmation is enabled on this project — set SMOKE_EMAIL/SMOKE_PASSWORD for a confirmed account, or turn on auto-confirm)"
    : "";
  return { session: null, reason: `${reason}${hint}` };
}

/** Seeds a Supabase session into a Playwright context so gated routes render. */
export async function applySession(context, origin, session) {
  const key = storageKey();
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type ?? "bearer",
    expires_in: session.expires_in ?? 3600,
    expires_at:
      session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    user: session.user,
  });
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [key, payload],
  );
  await page.close();
}
