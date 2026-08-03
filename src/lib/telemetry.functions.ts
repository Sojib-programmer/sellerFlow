import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

// Read side of the telemetry pipeline. Auth-gated and further restricted to
// store owners: the buffer holds stack traces, route paths and session IDs.
export const getDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DiagnosticsSnapshot> => {
    const { data: isOwner, error } = await context.supabase.rpc("has_store_role_any", {
      _role: "owner",
    });
    if (error) throw new Error("Forbidden");
    if (!isOwner) throw new Error("Forbidden: store owner access required");

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
