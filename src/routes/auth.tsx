import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/sellerflow/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup" | "forgot";

function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value === "/auth") return "/dashboard";
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(s["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — SellerFlow BD" },
      {
        name: "description",
        content:
          "Sign in or create your SellerFlow BD account to run your Bangladesh social-commerce store: orders, couriers, COD and inventory.",
      },
      { property: "og:title", content: "Sign in — SellerFlow BD" },
      {
        property: "og:description",
        content: "Access your SellerFlow BD store workspace.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const redirect = safeRedirect(search.redirect);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Session recovery: an already-signed-in visitor should never see this page.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void navigate({ to: redirect, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        void navigate({ to: redirect, replace: true });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 6;
  const valid =
    mode === "forgot" ? emailOk : emailOk && passwordOk && (mode === "signin" || true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!valid) {
      setError(
        !emailOk
          ? "Enter a valid email address."
          : "Password must be at least 6 characters.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        toast.success("Welcome back");
        void navigate({ to: redirect, replace: true });
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: storeName.trim() ? { store_name: storeName.trim() } : {},
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          toast.success("Store created — welcome to SellerFlow BD");
          void navigate({ to: redirect, replace: true });
        } else {
          setNotice(
            "Check your email to confirm the address, then come back and sign in.",
          );
        }
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) throw resetError;
      setNotice("Password reset link sent. Check your inbox.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Sign in to your store"
      : mode === "signup"
        ? "Create your store"
        : "Reset your password";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link to="/" aria-label="SellerFlow BD home">
          <Logo />
        </Link>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/">
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
        </Button>
      </header>

      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "One account, one store. You become the store owner instantly."
              : mode === "signin"
                ? "Use the email and password you signed up with."
                : "We will email you a link to choose a new password."}
          </p>

          <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
            {mode === "signup" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="store-name">Store name</Label>
                <Input
                  id="store-name"
                  autoComplete="organization"
                  placeholder="Dhaka Fashion House"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== "forgot" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="text-xs font-semibold text-primary">
                {notice}
              </p>
            ) : null}

            <Button type="submit" className="w-full gap-2 shadow-primary" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create store"
                  : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
            {mode !== "signin" ? (
              <button
                type="button"
                className="font-semibold text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
              >
                Already have an account? Sign in
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  New here? Create a store
                </button>
                <button
                  type="button"
                  className="font-semibold text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Forgot password?
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
