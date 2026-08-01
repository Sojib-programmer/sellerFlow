import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/sellerflow/logo";
import { SiteFooter } from "@/components/sellerflow/footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SellerFlow BD — Your social orders, finally under control" },
      {
        name: "description",
        content:
          "SellerFlow BD is the operations hub for Bangladeshi Facebook, Instagram, TikTok and WhatsApp sellers: chat orders, couriers, COD and inventory.",
      },
      {
        property: "og:title",
        content: "SellerFlow BD — Your social orders, finally under control",
      },
      {
        property: "og:description",
        content:
          "SellerFlow BD is the operations hub for Bangladeshi Facebook, Instagram, TikTok and WhatsApp sellers: chat orders, couriers, COD and inventory.",
      },
    ],
  }),
  component: WelcomePage,
});

const HIGHLIGHTS = [
  "Unified inbox for Facebook, Instagram, TikTok & WhatsApp",
  "COD tracking across Pathao, RedX, Steadfast, Paperfly & Sundarban",
  "Live inventory and district-level delivery insight",
];

const GLANCE = [
  { k: "Orders", v: "38" },
  { k: "Revenue", v: "৳86,420" },
  { k: "Pending", v: "7" },
  { k: "COD to collect", v: "৳42,750" },
];

function WelcomePage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Logo size="lg" />
          <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your social orders, finally under control.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The back-office workspace for Bangladeshi social commerce merchants — chat orders,
            couriers, COD and inventory in one place.
          </p>

          <Button asChild className="mt-8 h-12 w-full gap-2 text-base">
            <Link to="/dashboard">
              Enter demo workspace
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Demo mode — no account, sample data only
          </p>

          <ul className="mt-10 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="mx-auto w-full">
            <SiteFooter />
          </div>
        </div>
      </div>

      <aside className="relative hidden items-center justify-center overflow-hidden bg-navy px-12 lg:flex">
        <div className="absolute -top-24 -right-16 size-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-10 size-72 rounded-full bg-coral/20 blur-3xl" />
        <div className="relative w-full max-w-md space-y-4">
          <div className="rounded-2xl border border-border/10 bg-card/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Today at a glance
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {GLANCE.map((s) => (
                <div key={s.k}>
                  <p className="text-xs text-navy-foreground/60">{s.k}</p>
                  <p className="num mt-0.5 text-xl font-bold text-navy-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/10 bg-card/5 p-6 backdrop-blur">
            <p className="text-sm leading-relaxed text-navy-foreground/80">
              “Age Messenger, WhatsApp ar khata — sob alada chilo. Ekhon ek jaygay sob order track
              kori.”
            </p>
            <p className="mt-3 text-xs text-navy-foreground/50">
              Sharmin Akter · Rongdhonu Collection, Dhaka
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
