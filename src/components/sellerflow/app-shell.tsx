import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Plus,
  Settings as SettingsIcon,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { SiteFooter } from "./footer";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { conversations } from "@/lib/sellerflow-data";
import { useSellerFlow } from "@/lib/sellerflow-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/products", label: "Products", icon: Package },
  { to: "/couriers", label: "Couriers", icon: Truck },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const MOBILE_PRIMARY = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

const STORE = { name: "Dan’s Store", owner: "Dan Luca · Growth plan" };

export function AppShell({ children }: { children: ReactNode }) {
  const { orders } = useSellerFlow();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unread = conversations.length;
  const newOrders = orders.filter((o) => o.status === "New").length;
  const badgeFor = (to: string) =>
    to === "/inbox" ? unread : to === "/orders" ? newOrders : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/dashboard" aria-label="SellerFlow BD home">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            const count = badgeFor(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                {count > 0 ? (
                  <span className="num rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-coral-foreground">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button asChild className="mb-3 w-full gap-2">
            <Link to="/orders/new">
              <Plus className="size-4" aria-hidden />
              Create order
            </Link>
          </Button>
          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="truncate text-sm font-semibold">{STORE.name}</p>
            <p className="truncate text-xs text-muted-foreground">{STORE.owner}</p>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <Link to="/dashboard" aria-label="SellerFlow BD home" className="min-w-0">
          <Logo size="sm" />
        </Link>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link to="/orders/new">
            <Plus className="size-4" aria-hidden />
            New
          </Link>
        </Button>
      </header>

      <main className="pb-24 lg:pb-10 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
          {children}
          <SiteFooter />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        {MOBILE_PRIMARY.map((n) => {
          const active = pathname.startsWith(n.to);
          const count = badgeFor(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <n.icon className="size-5" aria-hidden />
              {n.label}
              {count > 0 ? (
                <span className="num absolute top-1.5 right-[22%] rounded-full bg-coral px-1 text-[9px] font-bold text-coral-foreground">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              MOBILE_MORE.some((n) => pathname.startsWith(n.to))
                ? "text-primary"
                : "text-muted-foreground",
            )}
            aria-label="More navigation"
          >
            <MoreHorizontal className="size-5" aria-hidden />
            More
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid gap-1 px-4 pb-6">
              {MOBILE_MORE.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                >
                  <n.icon className="size-4" aria-hidden />
                  {n.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
