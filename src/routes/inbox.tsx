import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sellerflow/page-header";
import { useOrderDialogs } from "@/components/sellerflow/use-order-dialogs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { conversations } from "@/lib/sellerflow-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Unified inbox — SellerFlow BD" },
      {
        name: "description",
        content:
          "Reply to Facebook, WhatsApp, TikTok and Instagram customers in one inbox and turn any chat into an order.",
      },
      { property: "og:title", content: "Unified inbox — SellerFlow BD" },
      {
        property: "og:description",
        content: "One inbox for every social channel — reply and convert to orders instantly.",
      },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { dialogs, openCreate } = useOrderDialogs();
  const [active, setActive] = useState<number | null>(null);
  const conversation = active === null ? null : conversations[active]!;

  return (
    <>
      <PageHeader
        title="Unified inbox"
        subtitle="Turn social messages into orders without switching apps."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {conversations.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setActive(i)}
              className={cn(
                "w-full border-b border-border p-4 text-left transition-colors last:border-0 hover:bg-accent/40",
                active === i && "bg-accent/60",
              )}
            >
              <div className="flex items-center justify-between">
                <b>{c.name}</b>
                <span className="text-[11px] text-muted-foreground">{c.ago}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="status-pill status-new mr-1.5">{c.channel}</span>
                {c.message}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          {!conversation ? (
            <div className="py-14 text-center text-muted-foreground">
              <p className="text-2xl">💬</p>
              <strong className="mt-2 block text-base text-foreground">
                Select a conversation
              </strong>
              Choose a message to reply or turn it into an order.
            </div>
          ) : (
            <>
              <div className="border-b border-border pb-4">
                <b>{conversation.name}</b>
                <p className="mt-1 text-xs text-muted-foreground">{conversation.channel}</p>
              </div>
              <p className="my-5 max-w-[80%] rounded-lg bg-surface p-3 text-xs">
                {conversation.message}
              </p>
              <Textarea placeholder="Type a reply..." rows={3} />
              <div className="mt-3 flex gap-2">
                <Button
                  className="shadow-primary"
                  onClick={() => toast.success("Reply sent — demo mode")}
                >
                  Send reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    openCreate({ name: conversation.name, channel: conversation.channel })
                  }
                >
                  Add as order
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {dialogs}
    </>
  );
}
