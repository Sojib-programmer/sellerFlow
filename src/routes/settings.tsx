import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/sellerflow/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SellerFlow BD" },
      {
        name: "description",
        content:
          "Manage your store profile, team, notifications, payment preferences and channel integrations.",
      },
      { property: "og:title", content: "Settings — SellerFlow BD" },
      {
        property: "og:description",
        content: "Store, team and payment preferences for your SellerFlow workspace.",
      },
    ],
  }),
  component: SettingsPage,
});

const sections = [
  ["Store profile", "Dan’s Fashion House · Dhaka, Bangladesh"],
  ["Team members", "Dan Luca (Owner) · Add teammate"],
  ["Notifications", "Order alerts, delivery updates, COD reminders"],
  ["Payment preferences", "Cash on Delivery enabled · bKash coming soon"],
  ["Integrations", "Facebook, TikTok, WhatsApp, and courier links — Coming soon"],
];

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your store, team, and preferences." />
      <div className="grid max-w-3xl gap-3.5">
        {sections.map(([title, body]) => (
          <div
            key={title}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <div>
              <h3 className="text-[15px] font-bold">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => toast.success(`${title} settings opened — demo mode`)}
            >
              Manage
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
