import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LEAVE_TYPES = ["Sick Leave", "Personal Work Leave", "Mid-Day Offsite"] as const;
const DURATIONS = ["Full Day", "Half Day", "Hourly"] as const;

type Leave = {
  id: string;
  leave_type: string;
  duration_type: string;
  hours_needed: number | null;
  start_date: string;
  end_date: string;
  reason_notes: string;
  status: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  Pending: "bg-amber-500 text-white",
  Approved: "bg-emerald-600 text-white",
  Rejected: "bg-red-600 text-white",
};

export function WorkerLeaves() {
  const [type, setType] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [hours, setHours] = useState("");
  const [start, setStart] = useState<Date | undefined>(new Date());
  const [end, setEnd] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Leave[]>([]);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase.from("staff_leaves").select("*")
      .eq("staff_id", u.user.id).order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setHistory((data as Leave[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!type || !duration || !start || !end || !reason.trim()) return toast.error("Fill all fields");
    if (duration === "Hourly" && !hours) return toast.error("Enter hours needed");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    setSaving(true);
    const { error } = await supabase.from("staff_leaves").insert({
      staff_id: u.user.id,
      leave_type: type as never,
      duration_type: duration as never,
      hours_needed: duration === "Hourly" ? Number(hours) : null,
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
      reason_notes: reason,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Leave request submitted");
    setType(""); setDuration(""); setHours(""); setReason("");
    load();
  }

  return (
    <div className="space-y-4 px-3 sm:px-0">
      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10">
          <CardTitle className="text-2xl font-bold tracking-tight">Request Time Off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <Label className="font-semibold">Leave Type</Label>
            <div className="flex flex-wrap gap-2">
              {LEAVE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 py-1.5 border-2 border-slate-900 text-xs font-bold uppercase tracking-wider",
                    type === t ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                  )}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="border-2"><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {duration === "Hourly" && (
            <div className="space-y-2">
              <Label className="font-semibold">Hours Needed</Label>
              <Input inputMode="decimal" className="border-2" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-semibold">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start border-2 rounded-none font-semibold">
                    <CalendarIcon className="mr-2 h-4 w-4" />{start ? format(start, "PP") : "Pick"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={start} onSelect={setStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start border-2 rounded-none font-semibold">
                    <CalendarIcon className="mr-2 h-4 w-4" />{end ? format(end, "PP") : "Pick"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={end} onSelect={setEnd} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Reason (required)</Label>
            <Textarea rows={3} className="border-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain your request…" />
          </div>

          <Button onClick={submit} disabled={saving} className="w-full h-12 font-bold rounded-none bg-slate-900 hover:bg-slate-800">
            {saving ? "Submitting…" : "Submit Leave Request"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10">
          <CardTitle className="text-lg font-bold">My Leave History</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">No requests yet</p>
          ) : history.map((l) => (
            <div key={l.id} className="border-2 border-slate-900/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">{l.leave_type} · {l.duration_type}{l.hours_needed ? ` (${l.hours_needed}h)` : ""}</p>
                  <p className="text-xs text-slate-600">{l.start_date} → {l.end_date}</p>
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1", statusColor[l.status] ?? "bg-slate-200")}>
                  {l.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700">{l.reason_notes}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
