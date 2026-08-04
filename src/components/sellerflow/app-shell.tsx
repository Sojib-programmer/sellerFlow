import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
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
  SheetDescription,
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
  { to: "/diagnostics", label: "Diagnostics", icon: Activity },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const MOBILE_PRIMARY = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// `startsWith` alone marks /orders active on /orders/new, which would announce two
// current pages. Match the exact path only, so at most one item is current.
function isActive(pathname: string, to: string) {
  return pathname === to || pathname === `${to}/`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { orders } = useSellerFlow();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unread = conversations.length;
  const newOrders = orders.filter((o) => o.status === "New").length;
  const badgeFor = (to: string) =>
    to === "/inbox" ? unread : to === "/orders" ? newOrders : 0;
  const badgeLabelFor = (to: string) =>
    to === "/inbox" ? "unread conversations" : "new orders";

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground",
          FOCUS_RING,
        )}
      >
        Skip to content
      </a>

      {/* Desktop sidebar — display:none below lg, so it is absent from the a11y tree there */}
      <aside
        data-testid="app-sidebar"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex"
      >
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/dashboard" aria-label="SellerFlow BD home" className={cn("rounded-md", FOCUS_RING)}>
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Sidebar navigation">
          {NAV.map((n) => {
            const active = isActive(pathname, n.to);
            const count = badgeFor(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  FOCUS_RING,
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                {count > 0 ? (
                  <>
                    <span
                      aria-hidden
                      className="num rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-coral-foreground"
                    >
                      {count}
                    </span>
                    <span className="sr-only">{`${count} ${badgeLabelFor(n.to)}`}</span>
                  </>
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
        <Link
          to="/dashboard"
          aria-label="SellerFlow BD home"
          className={cn("min-w-0 rounded-md", FOCUS_RING)}
        >
          <Logo size="sm" />
        </Link>
        <Button asChild size="sm" className="min-h-11 shrink-0 gap-1.5">
          <Link to="/orders/new">
            <Plus className="size-4" aria-hidden />
            New
          </Link>
        </Button>
      </header>

      <main id="main-content" className="pb-24 lg:pb-10 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
          {children}
          <SiteFooter />
        </div>
      </main>

      {/* Mobile bottom nav — display:none at lg and above */}
      <nav
        data-testid="app-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary navigation"
      >
        {MOBILE_PRIMARY.map((n) => {
          const active = isActive(pathname, n.to);
          const count = badgeFor(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                FOCUS_RING,
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <n.icon className="size-5" aria-hidden />
              {n.label}
              {count > 0 ? (
                <>
                  <span
                    aria-hidden
                    className="num absolute top-1.5 right-[22%] rounded-full bg-coral px-1 text-[9px] font-bold text-coral-foreground"
                  >
                    {count}
                  </span>
                  <span className="sr-only">{`${count} ${badgeLabelFor(n.to)}`}</span>
                </>
              ) : null}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "flex min-h-11 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              FOCUS_RING,
              MOBILE_MORE.some((n) => isActive(pathname, n.to))
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
              <SheetDescription>
                Additional SellerFlow sections: couriers, analytics, diagnostics and settings.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-1 px-4 pb-6">
              {MOBILE_MORE.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-current={isActive(pathname, n.to) ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted",
                    FOCUS_RING,
                  )}
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
