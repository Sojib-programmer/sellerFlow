import { createServerFn } from "@tanstack/react-start";

import { groupEvents, type ErrorEvent, type ErrorGroup } from "./telemetry-types";

export type DiagnosticsSnapshot = {
  fetchedAt: string;
  release: string;
  totalEvents: number;
  byLevel: Record<string, number>;
  groups: ErrorGroup[];
  events: ErrorEvent[];
  webhookConfigured: boolean;
};

// Read side of the telemetry pipeline. Not exposed as an HTTP route: server
// functions inherit site auth on the published deployment, so the diagnostics
// data is not reachable from the open internet the way /api/public/* is.
export const getDiagnostics = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiagnosticsSnapshot> => {
    const { readEvents } = await import("./telemetry-sink.server");
    const events = readEvents();
    const byLevel: Record<string, number> = {};
    for (const event of events) byLevel[event.level] = (byLevel[event.level] ?? 0) + 1;

    return {
      fetchedAt: new Date().toISOString(),
      release: process.env["RELEASE"] ?? "dev",
      totalEvents: events.length,
      byLevel,
      groups: groupEvents(events),
      events,
      webhookConfigured: Boolean(process.env["TELEMETRY_WEBHOOK_URL"]),
    };
  },
);
