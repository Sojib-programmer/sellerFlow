import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

const workspaceLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/orders", label: "Orders" },
  { to: "/inbox", label: "Inbox" },
  { to: "/products", label: "Products" },
] as const;

const opsLinks = [
  { to: "/couriers", label: "Couriers & COD" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
] as const;

const couriers = ["Pathao", "Steadfast", "RedX", "Paperfly", "Sundarban"];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border pt-8 pb-4">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo size="sm" />
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
            The back-office workspace for Bangladeshi social commerce merchants — chat orders,
            couriers, COD and inventory in one place.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Courier partners: <span className="text-foreground">{couriers.join(" · ")}</span>
          </p>
        </div>

        <nav aria-label="Workspace">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Workspace
          </h2>
          <ul className="mt-3 space-y-2">
            {workspaceLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Operations">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Operations
          </h2>
          <ul className="mt-3 space-y-2">
            {opsLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} SellerFlow BD · Demo workspace, sample data only.</p>
        <p>Made for Dhaka-based social sellers.</p>
      </div>
    </footer>
  );
}
