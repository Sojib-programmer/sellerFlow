import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sellerflow/page-header";
import { Panel, StateBlock } from "@/components/sellerflow/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerFlow, useStoreMembers } from "@/lib/sellerflow-store";

export const Route = createFileRoute("/_authenticated/_app/settings")({
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

function SettingsPage() {
  const {
    store,
    orders,
    isOwner,
    isLoading,
    isError,
    error,
    refetch,
    renameStore,
    loadDemoData,
  } = useSellerFlow();
  const members = useStoreMembers();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const storeName = name || store?.name || "";
  const hasData = orders.length > 0;

  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return toast.error("Store name is required");
    setRenaming(true);
    try {
      await renameStore(storeName.trim());
      toast.success("Store name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename store");
    } finally {
      setRenaming(false);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const result = await loadDemoData();
      toast.success(`Loaded ${result.orders} orders and ${result.products} products`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load demo data");
    } finally {
      setSeeding(false);
    }
  }

  if (isLoading)
    return (
      <>
        <PageHeader title="Settings" subtitle="Manage your store, team, and preferences." />
        <StateBlock tone="loading" title="Loading your store settings" />
      </>
    );

  if (isError)
    return (
      <>
        <PageHeader title="Settings" subtitle="Manage your store, team, and preferences." />
        <StateBlock
          tone="error"
          title="Could not load settings"
          body={error?.message ?? "Please try again."}
          action={
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </>
    );

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your store, team, and preferences." />
      <div className="grid max-w-3xl gap-3.5">
        <Panel title="Store profile" subtitle={`You are signed in as ${store?.role ?? "member"}`}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => void submitRename(e)}>
            <div className="grid min-w-[240px] flex-1 gap-1.5">
              <Label htmlFor="store-name">Store name</Label>
              <Input
                id="store-name"
                value={storeName}
                disabled={!isOwner}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {isOwner ? (
              <Button type="submit" className="gap-2 shadow-primary" disabled={renaming}>
                {renaming ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Save
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only the store owner can rename the store.
              </p>
            )}
          </form>
        </Panel>

        <Panel title="Team members" subtitle="Everyone with access to this store">
          {members.isPending ? (
            <p className="text-xs text-muted-foreground">Loading team…</p>
          ) : members.isError ? (
            <p role="alert" className="text-xs text-destructive">
              Could not load team members.
            </p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {(members.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <span>{m.isYou ? "You" : "Teammate"}</span>
                  <b className="text-xs capitalize text-muted-foreground">{m.role}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Demo data"
          subtitle="Seed realistic Bangladesh social-commerce records to explore the console"
        >
          {!isOwner ? (
            <p className="text-xs text-muted-foreground">
              Only the store owner can load demo data.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="gap-2 shadow-primary"
                disabled={seeding || hasData}
                onClick={() => void seed()}
              >
                {seeding ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Load demo data
              </Button>
              <p className="text-xs text-muted-foreground">
                {hasData
                  ? "This store already has orders, so seeding is disabled."
                  : "Adds sample products, customers and orders. Safe to press once."}
              </p>
            </div>
          )}
        </Panel>

        <Panel
          title="Payments & integrations"
          subtitle="Cash on Delivery enabled · bKash, courier APIs and channel sync coming soon"
        >
          <p className="text-xs text-muted-foreground">
            Courier name and tracking numbers are saved manually for now.
          </p>
        </Panel>
      </div>
    </>
  );
}
