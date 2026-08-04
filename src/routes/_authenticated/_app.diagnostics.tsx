import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/sellerflow/page-header";
import { Panel } from "@/components/sellerflow/primitives";
import { Button } from "@/components/ui/button";
import { getDiagnostics } from "@/lib/telemetry.functions";
import { clearLocalTelemetry, localTelemetry } from "@/lib/telemetry-client";
import { groupEvents, type ErrorEvent, type ErrorGroup } from "@/lib/telemetry-types";

export const Route = createFileRoute("/_app/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics — SellerFlow BD" },
      {
        name: "description",
        content:
          "Live runtime error reporting for the SellerFlow workspace: captured exceptions, console errors, affected routes and release health.",
      },
      { property: "og:title", content: "Diagnostics — SellerFlow BD" },
      {
        property: "og:description",
        content: "Runtime exceptions and console errors captured across the SellerFlow workspace.",
      },
    ],
  }),
  component: DiagnosticsPage,
});

const LEVELS = ["all", "error", "warning", "info"] as const;

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function Sparkline({ events }: { events: ErrorEvent[] }) {
  // 12 five-minute buckets over the last hour.
  const buckets = useMemo(() => {
    const out = Array.from({ length: 12 }, () => 0);
    const now = Date.now();
    for (const event of events) {
      const age = now - new Date(event.occurredAt).getTime();
      const index = 11 - Math.floor(age / (5 * 60 * 1000));
      if (index >= 0 && index < 12) out[index] = (out[index] ?? 0) + 1;
    }
    return out;
  }, [events]);
  const max = Math.max(1, ...buckets);

  return (
    <div className="flex h-16 items-end gap-1" role="img" aria-label="Error volume over the last hour">
      {buckets.map((value, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-coral/70"
          style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
          title={`${value} event(s)`}
        />
      ))}
    </div>
  );
}

function DiagnosticsPage() {
  const fetchDiagnostics = useServerFn(getDiagnostics);
  const [local, setLocal] = useState<ErrorEvent[]>([]);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [selected, setSelected] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sync = () => setLocal(localTelemetry());
    sync();
    window.addEventListener("sellerflow:telemetry", sync);
    return () => window.removeEventListener("sellerflow:telemetry", sync);
  }, []);

  const query = useQuery({
    queryKey: ["diagnostics"],
    queryFn: () => fetchDiagnostics({}),
    refetchInterval: 15_000,
  });

  const events = useMemo(() => {
    const seen = new Set<string>();
    return [...local, ...(query.data?.events ?? [])]
      .filter((event) => (seen.has(event.id) ? false : (seen.add(event.id), true)))
      .filter((event) => level === "all" || event.level === level)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [local, query.data, level]);

  const groups: ErrorGroup[] = useMemo(() => groupEvents(events), [events]);
  const detail = groups.find((g) => g.fingerprint === selected) ?? groups[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostics"
        subtitle="Runtime exceptions, unhandled rejections and console errors captured from real sessions."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Events captured
          </p>
          <p className="num mt-1 text-2xl font-bold">{events.length}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Distinct faults
          </p>
          <p className="num mt-1 text-2xl font-bold">{groups.length}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Release
          </p>
          <p className="mt-1 text-2xl font-bold">{query.data?.release ?? "dev"}</p>
        </div>
      </div>

      <Panel title="Error volume (last hour)">
        <Sparkline events={events} />
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Level</span>
        {LEVELS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={level === option ? "default" : "outline"}
            aria-pressed={level === option}
            onClick={() => setLevel(option)}
            className="min-h-11 capitalize sm:min-h-9"
          >
            {option}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="min-h-11 sm:min-h-9"
          onClick={() => {
            clearLocalTelemetry();
            void query.refetch();
          }}
        >
          Clear session events
        </Button>
      </div>

      <Panel title="Grouped faults">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No errors captured. Uncaught exceptions, rejected promises and console errors from any
            session appear here automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Captured runtime faults grouped by fingerprint</caption>
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3">Message</th>
                  <th scope="col" className="py-2 pr-3">Route</th>
                  <th scope="col" className="py-2 pr-3">Source</th>
                  <th scope="col" className="py-2 pr-3">Count</th>
                  <th scope="col" className="py-2 pr-3">Last seen</th>
                  <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.fingerprint} className="border-t border-border align-top">
                    <td className="max-w-[26rem] py-2 pr-3 font-medium">{group.message}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{group.route}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{group.source}</td>
                    <td className="num py-2 pr-3">{group.count}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{timeAgo(group.lastSeen)}</td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 sm:min-h-9"
                        onClick={() => setSelected(group.fingerprint)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {detail ? (
        <Panel title={`Detail · ${detail.fingerprint}`}>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="font-medium capitalize">{detail.level}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Occurrences</dt>
              <dd className="num font-medium">{detail.count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">First seen</dt>
              <dd className="font-medium">{timeAgo(detail.firstSeen)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Session</dt>
              <dd className="font-medium break-all">{detail.latest.sessionId}</dd>
            </div>
          </dl>
          <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
            {detail.latest.stack ?? detail.message}
          </pre>
        </Panel>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Events are scrubbed of emails, phone numbers and tokens in the browser before they are sent,
        rate-limited per fault, and mirrored to the server log pipeline
        {query.data?.webhookConfigured ? " and the configured external error tracker" : ""}.
      </p>
    </div>
  );
}
