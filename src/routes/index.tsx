import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { WorkerDashboard } from "@/components/WorkerDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { BillingDashboard } from "@/components/BillingDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Loader2, LogOut, MapPin, ShieldCheck, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Role = "worker" | "admin" | "accountant";
type ViewMode = "field" | "billing";

const VIEW_KEY = "lifecare_view_mode";

function Index() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState<string>("");
  const [view, setView] = useState<ViewMode>("field");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("staff_profiles")
        .select("role,staff_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      const r = (profile?.role as Role) ?? "worker";
      setRole(r);
      setName(profile?.staff_name ?? data.user.email ?? "");
      const saved = localStorage.getItem(VIEW_KEY) as ViewMode | null;
      setView(saved ?? (r === "accountant" ? "billing" : "field"));
      setReady(true);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  function toggleView() {
    const next: ViewMode = view === "field" ? "billing" : "field";
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const isBilling = view === "billing";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-center" />
      <header className="border-b-2 border-slate-900 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">Lifecare Portal</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {role} · {name} · {isBilling ? "Billing Mode" : "Field Mode"}
            </p>
          </div>
          <Button onClick={toggleView} variant="outline" className="shrink-0 border-2 border-slate-900 font-bold rounded-none text-xs sm:text-sm">
            {isBilling ? <><MapPin className="h-4 w-4 mr-1.5" />Switch to Field</> : <><Briefcase className="h-4 w-4 mr-1.5" />Switch to Billing</>}
          </Button>
          <Button onClick={signOut} variant="outline" className="shrink-0 border-2 border-slate-900 font-bold rounded-none">
            <LogOut className="h-4 w-4 mr-1.5" />Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-0 sm:px-4 py-4 sm:py-6">
        {isBilling
          ? <BillingDashboard />
          : role === "admin"
            ? <AdminDashboard />
            : <WorkerDashboard />}
      </main>
    </div>
  );
}
