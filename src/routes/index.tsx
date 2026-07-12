import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { WorkerDashboard } from "@/components/WorkerDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ensureDemoSession } from "@/lib/demo-auth";
import { Loader2, ShieldCheck, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [role, setRole] = useState<"worker" | "admin">("worker");
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSwitching(true);
    ensureDemoSession(role)
      .then(() => { if (!cancelled) { setReady(true); setSwitching(false); } })
      .catch((e) => { console.error(e); setSwitching(false); });
    return () => { cancelled = true; };
  }, [role]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-center" />
      <header className="border-b-2 border-slate-900 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">Lifecare Portal</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {role === "admin" ? "Admin Console" : "Field Worker"}
            </p>
          </div>
          <Button
            onClick={() => setRole(role === "worker" ? "admin" : "worker")}
            disabled={switching}
            variant="outline"
            className="shrink-0 border-2 border-slate-900 font-bold rounded-none"
          >
            {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : role === "worker" ? (
              <><ShieldCheck className="h-4 w-4 mr-1.5" />Admin</>
            ) : (
              <><User className="h-4 w-4 mr-1.5" />Worker</>
            )}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-0 sm:px-4 py-4 sm:py-6">
        {!ready ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Preparing session…
          </div>
        ) : role === "worker" ? <WorkerDashboard /> : <AdminDashboard />}
      </main>
    </div>
  );
}
