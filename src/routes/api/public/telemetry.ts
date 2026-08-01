import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MAX_BATCH_SIZE, MAX_MESSAGE_LENGTH, MAX_STACK_LENGTH } from "@/lib/telemetry-types";

// Public ingest endpoint for browser error telemetry. Lives under /api/public so
// `navigator.sendBeacon` still lands during page unload on the published site,
// where site auth would otherwise reject the beacon.
//
// Security posture: write-only, no reads, no PII returned, hard input caps, and
// a per-fingerprint rate limit applied inside the sink.

const MAX_BODY_BYTES = 64 * 1024;

const eventSchema = z.object({
  level: z.enum(["error", "warning", "info"]),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH * 4),
  stack: z.string().max(MAX_STACK_LENGTH * 2).optional(),
  route: z.string().max(300),
  source: z.string().max(60),
  release: z.string().max(60),
  sessionId: z.string().max(64),
  userAgent: z.string().max(300).optional(),
  extra: z.record(z.unknown()).optional(),
});

const payloadSchema = z.object({
  events: z.array(eventSchema).min(1).max(MAX_BATCH_SIZE),
});

export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }

        let parsed;
        try {
          parsed = payloadSchema.safeParse(JSON.parse(raw));
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const { ingest } = await import("@/lib/telemetry-sink.server");
        const result = ingest(
          parsed.data.events.map((event) => ({
            ...event,
            userAgent: event.userAgent ?? request.headers.get("user-agent") ?? undefined,
          })),
        );

        return new Response(JSON.stringify(result), {
          status: 202,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
