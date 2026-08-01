// Shared error-telemetry contract. Imported by both browser and server code, so
// this module must stay free of any runtime-specific API.

export type ErrorLevel = "error" | "warning" | "info";

export type ErrorEventInput = {
  level: ErrorLevel;
  message: string;
  stack?: string;
  route: string;
  source: string;
  release: string;
  sessionId: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
};

export type ErrorEvent = ErrorEventInput & {
  id: string;
  occurredAt: string;
  fingerprint: string;
};

export type ErrorGroup = {
  fingerprint: string;
  message: string;
  level: ErrorLevel;
  route: string;
  source: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  latest: ErrorEvent;
};

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_STACK_LENGTH = 4_000;
export const MAX_BATCH_SIZE = 20;

// Strings that commonly carry secrets or personal data. Scrubbed before an event
// ever leaves the browser, so nothing sensitive is persisted or logged.
const REDACTIONS: Array<[RegExp, string]> = [
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, "[email]"],
  [/\b(?:\+?880|0)1[3-9]\d{8}\b/g, "[phone]"],
  [/\b(?:eyJ[\w-]{8,}\.){2}[\w-]{8,}\b/g, "[jwt]"],
  [/\b(?:sk|sb|pk|ghp|gho)_[A-Za-z0-9_-]{12,}\b/g, "[token]"],
  [/([?&](?:token|key|secret|password|access_token)=)[^&\s]+/gi, "$1[redacted]"],
];

export function scrub(value: string): string {
  let out = value;
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement);
  return out;
}

// Stable, dependency-free 53-bit hash (cyrb53). Groups repeats of the same fault
// without needing a crypto digest on either runtime.
export function fingerprintOf(parts: Array<string | undefined>): string {
  const input = parts.filter(Boolean).join("|");
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Strip the frame-specific noise (line/column, cache-busting hashes) so the same
// logical fault fingerprints identically across deploys.
function normalizeForFingerprint(message: string): string {
  return message
    .replace(/\d{2,}/g, "N")
    .replace(/-[A-Za-z0-9_]{8}\.js/g, "-HASH.js")
    .trim()
    .toLowerCase();
}

export function normalizeEvent(input: ErrorEventInput, id: string, occurredAt: string): ErrorEvent {
  const message = scrub(input.message).slice(0, MAX_MESSAGE_LENGTH);
  const stack = input.stack ? scrub(input.stack).slice(0, MAX_STACK_LENGTH) : undefined;
  return {
    ...input,
    message,
    ...(stack !== undefined ? { stack } : {}),
    id,
    occurredAt,
    fingerprint: fingerprintOf([input.level, normalizeForFingerprint(message), input.route]),
  };
}

export function groupEvents(events: ErrorEvent[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();
  for (const event of events) {
    const existing = groups.get(event.fingerprint);
    if (!existing) {
      groups.set(event.fingerprint, {
        fingerprint: event.fingerprint,
        message: event.message,
        level: event.level,
        route: event.route,
        source: event.source,
        count: 1,
        firstSeen: event.occurredAt,
        lastSeen: event.occurredAt,
        latest: event,
      });
      continue;
    }
    existing.count += 1;
    if (event.occurredAt < existing.firstSeen) existing.firstSeen = event.occurredAt;
    if (event.occurredAt >= existing.lastSeen) {
      existing.lastSeen = event.occurredAt;
      existing.latest = event;
    }
  }
  return [...groups.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
