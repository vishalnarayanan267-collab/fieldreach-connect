import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { WorkerDashboard } from "@/components/WorkerDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, ShieldCheck, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"worker" | "admin" | null>(null);
  const [name, setName] = useState<string>("");

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
      setRole((profile?.role as "worker" | "admin") ?? "worker");
      setName(profile?.staff_name ?? data.user.email ?? "");
      setReady(true);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-center" />
      <header className="border-b-2 border-slate-900 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">Lifecare Portal</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {role === "admin" ? "Admin" : "Worker"} · {name}
            </p>
          </div>
          <Button onClick={signOut} variant="outline" className="shrink-0 border-2 border-slate-900 font-bold rounded-none">
            <LogOut className="h-4 w-4 mr-1.5" />Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-0 sm:px-4 py-4 sm:py-6">
        {role === "admin" ? <AdminDashboard /> : <WorkerDashboard />}
      </main>
    </div>
  );
}
