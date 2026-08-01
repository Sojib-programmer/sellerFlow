import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const workspace = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: ShoppingBag },
  { label: "Inbox", to: "/inbox", icon: MessageCircle, badge: 3 },
  { label: "Products", to: "/products", icon: Package },
  { label: "Delivery", to: "/delivery", icon: Truck },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
] as const;

const account = [{ label: "Settings", to: "/settings", icon: Settings }] as const;

const mobile = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: ShoppingBag },
  { label: "Inbox", to: "/inbox", icon: MessageCircle },
  { label: "Products", to: "/products", icon: Package },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
] as const;

function useCurrentPath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

function Brand() {
  return (
    <div className="mx-2 mb-8 flex items-center gap-2 text-[21px] font-extrabold tracking-tight">
      <span className="size-[11px] rounded-full bg-primary" />
      Seller<span className="-ml-2 text-primary">Flow</span>
      <span className="text-xs font-bold text-muted-foreground">BD</span>
    </div>
  );
}

export function Sidebar() {
  const path = useCurrentPath();

  const item = (
    entry: { label: string; to: string; icon: typeof Settings; badge?: number },
  ) => {
    const active = path === entry.to;
    const Icon = entry.icon;
    return (
      <Link
        key={entry.to}
        to={entry.to}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent font-bold text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" strokeWidth={2.2} />
        {entry.label}
        {entry.badge ? (
          <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
            {entry.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[250px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <Brand />
      <p className="mx-3 mb-2 text-[11px] font-bold tracking-widest text-muted-foreground">
        WORKSPACE
      </p>
      <nav className="flex flex-col gap-0.5">{workspace.map(item)}</nav>
      <p className="mx-3 mb-2 mt-5 text-[11px] font-bold tracking-widest text-muted-foreground">
        ACCOUNT
      </p>
      <nav className="flex flex-col gap-0.5">{account.map(item)}</nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-sidebar-border px-2 pt-4">
        <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">
          DL
        </span>
        <div className="leading-tight">
          <b>Dan&rsquo;s Store</b>
          <small className="block text-muted-foreground">Growth plan</small>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = useCurrentPath();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-card py-2 md:hidden">
      {mobile.map((entry) => {
        const Icon = entry.icon;
        const active = path === entry.to;
        return (
          <Link
            key={entry.to}
            to={entry.to}
            className={cn(
              "flex flex-col items-center gap-1 px-2 text-[11px] text-muted-foreground",
              active && "font-bold text-primary",
            )}
          >
            <Icon className="size-[18px]" strokeWidth={2.2} />
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
