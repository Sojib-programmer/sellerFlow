import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/sellerflow/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — SellerFlow BD" },
      {
        name: "description",
        content: "Set a new password for your SellerFlow BD store account.",
      },
      { property: "og:title", content: "Choose a new password — SellerFlow BD" },
      {
        property: "og:description",
        content: "Set a new password for your SellerFlow BD store account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    toast.success("Password updated");
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-extrabold tracking-tight">Choose a new password</h1>
          {!ready ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Open this page from the reset link in your email to continue.
            </p>
          ) : null}
          <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full gap-2 shadow-primary"
              disabled={busy || !ready}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Update password
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
