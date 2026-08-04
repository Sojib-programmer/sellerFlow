import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Session lives in localStorage, so the gate must run client-side only.
// Gating this subtree during SSR would loop on hard refresh.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
