import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { downloadIcs } from "@/lib/ics";

type Leave = {
  id: string;
  staff_id: string;
  leave_type: string;
  duration_type: string;
  hours_needed: number | null;
  start_date: string;
  end_date: string;
  reason_notes: string;
  status: string;
  created_at: string;
  staff_profiles: { staff_name: string } | null;
};

const statusColor: Record<string, string> = {
  Pending: "bg-amber-500 text-white",
  Approved: "bg-emerald-600 text-white",
  Rejected: "bg-red-600 text-white",
};

export function LeaveApprovals() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_leaves")
      .select("*, staff_profiles(staff_name)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setLeaves((data as unknown as Leave[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, status: "Approved" | "Rejected") {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("staff_leaves").update({
      status: status as never,
      reviewed_by: u.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "Approved") {
      const l = leaves.find(x => x.id === id);
      if (l) {
        downloadIcs({
          uid: `leave-${l.id}`,
          title: `Approved Leave: ${l.leave_type}`,
          description: `Duration: ${l.duration_type}${l.hours_needed ? ` (${l.hours_needed}h)` : ""}\nReason: ${l.reason_notes}\nStaff: ${l.staff_profiles?.staff_name ?? ""}`,
          startDate: l.start_date,
          endDate: l.end_date,
        });
      }
    }
    toast.success(`Leave ${status.toLowerCase()}${status === "Approved" ? " · calendar invite downloaded" : ""}`);
    load();
  }

  const agg = useMemo(() => {
    const out = { pending: 0, approved: 0, rejected: 0, onLeaveToday: 0 };
    const today = new Date().toISOString().slice(0, 10);
    for (const l of leaves) {
      if (l.status === "Pending") out.pending++;
      if (l.status === "Approved") {
        out.approved++;
        if (l.start_date <= today && l.end_date >= today) out.onLeaveToday++;
      }
      if (l.status === "Rejected") out.rejected++;
    }
    return out;
  }, [leaves]);

  const cards = [
    { label: "Pending", value: agg.pending, color: "text-amber-600" },
    { label: "Approved", value: agg.approved, color: "text-emerald-600" },
    { label: "Rejected", value: agg.rejected, color: "text-red-600" },
    { label: "On Leave Today", value: agg.onLeaveToday, color: "text-slate-900" },
  ];

  return (
    <div className="space-y-4 px-3 sm:px-0">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-2 border-slate-900/10 rounded-none shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
              <p className={cn("mt-1 text-2xl font-black", c.color)}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10">
          <CardTitle className="text-xl font-bold">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-6">Loading…</p>
          ) : leaves.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">No leave requests</p>
          ) : leaves.map((l) => (
            <div key={l.id} className="border-2 border-slate-900/10 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black text-sm">{l.staff_profiles?.staff_name ?? "—"}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {l.leave_type} · {l.duration_type}{l.hours_needed ? ` (${l.hours_needed}h)` : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{l.start_date} → {l.end_date}</p>
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 shrink-0", statusColor[l.status] ?? "bg-slate-200")}>
                  {l.status}
                </span>
              </div>
              <p className="text-xs text-slate-700 border-l-2 border-slate-900/20 pl-2">{l.reason_notes}</p>
              {l.status === "Pending" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button size="sm" onClick={() => decide(l.id, "Approved")}
                    className="rounded-none font-bold bg-emerald-600 hover:bg-emerald-700">
                    <Check className="h-4 w-4 mr-1" />Approve
                  </Button>
                  <Button size="sm" onClick={() => decide(l.id, "Rejected")}
                    className="rounded-none font-bold bg-red-600 hover:bg-red-700">
                    <X className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
