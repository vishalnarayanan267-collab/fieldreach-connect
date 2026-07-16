import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Download, Send } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { DirectoryTab } from "./DirectoryTab";
import { LeaveApprovals } from "./LeaveApprovals";

type Row = {
  id: string;
  date: string;
  visit_date: string | null;
  outcome_notes: string;
  travel_expense: number;
  food_expense: number;
  lodge_expense: number;
  purpose: string;
  h_master: { h_name: string; branch_area: string; city: string } | null;
  h_contacts: { contact_name: string } | null;
  staff_profiles: { staff_name: string } | null;
};

type Worker = { id: string; staff_name: string };
type Hospital = { id: string; h_name: string; branch_area: string; city: string };
type Task = {
  id: string;
  scheduled_date: string;
  task_notes: string;
  status: string;
  worker: { staff_name: string } | null;
  h_master: { h_name: string; branch_area: string; city: string } | null;
};

export function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [dispatchDate, setDispatchDate] = useState<Date | undefined>(new Date());
  const [dWorker, setDWorker] = useState("");
  const [dHospital, setDHospital] = useState("");
  const [dNotes, setDNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function load() {
    setLoading(true);
    const [logs, staff, hosp, tsk] = await Promise.all([
      supabase.from("daily_visit_logs")
        .select("id,date,visit_date,outcome_notes,travel_expense,food_expense,lodge_expense,purpose,h_master(h_name,branch_area,city),h_contacts(contact_name),staff_profiles(staff_name)")
        .order("visit_date", { ascending: false }),
      supabase.from("staff_profiles").select("id,staff_name,role").order("staff_name"),
      supabase.from("h_master").select("id,h_name,branch_area,city").order("h_name"),
      supabase.from("assigned_tasks")
        .select("id,scheduled_date,task_notes,status,worker:staff_profiles!assigned_tasks_worker_id_fkey(staff_name),h_master(h_name,branch_area,city)")
        .order("scheduled_date", { ascending: true }),
    ]);
    setLoading(false);
    if (logs.error) toast.error(logs.error.message);
    setRows((logs.data as unknown as Row[]) ?? []);
    setWorkers(((staff.data as { id: string; staff_name: string; role: string }[] | null) ?? []).filter((s) => s.role === "worker"));
    setHospitals((hosp.data as Hospital[] | null) ?? []);
    setTasks((tsk.data as unknown as Task[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.h_master?.city ?? "").toLowerCase().includes(s) ||
      (r.staff_profiles?.staff_name ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    visits: a.visits + 1,
    travel: a.travel + Number(r.travel_expense),
    food: a.food + Number(r.food_expense),
    lodge: a.lodge + Number(r.lodge_expense),
  }), { visits: 0, travel: 0, food: 0, lodge: 0 }), [filtered]);

  const taskDates = useMemo(() => tasks.map((t) => new Date(t.scheduled_date + "T00:00:00")), [tasks]);
  const tasksOnDispatch = useMemo(() => {
    if (!dispatchDate) return [];
    return tasks.filter((t) => isSameDay(new Date(t.scheduled_date + "T00:00:00"), dispatchDate));
  }, [tasks, dispatchDate]);

  function exportCsv() {
    const headers = ["Date", "Staff", "Hospital", "Branch", "City", "Person Met", "Purpose", "Outcome", "Travel", "Food", "Lodge", "Total Expense"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const lines = filtered.map((r) => {
      const total = Number(r.travel_expense) + Number(r.food_expense) + Number(r.lodge_expense);
      return [
        r.visit_date ?? r.date,
        r.staff_profiles?.staff_name ?? "",
        r.h_master?.h_name ?? "",
        r.h_master?.branch_area ?? "",
        r.h_master?.city ?? "",
        r.h_contacts?.contact_name ?? "",
        r.purpose,
        r.outcome_notes,
        r.travel_expense,
        r.food_expense,
        r.lodge_expense,
        total,
      ].map(escape).join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lifecare_visit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("CSV downloaded");
  }

  async function assignTask() {
    if (!dispatchDate || !dWorker || !dHospital || !dNotes.trim()) {
      return toast.error("Pick a date, worker, hospital, and enter notes");
    }
    if (startOfDay(dispatchDate) < startOfDay(new Date())) {
      return toast.error("Scheduled date must be today or later");
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    setAssigning(true);
    const { error } = await supabase.from("assigned_tasks").insert({
      assigned_by: u.user.id,
      worker_id: dWorker,
      h_id: dHospital,
      task_notes: dNotes,
      scheduled_date: format(dispatchDate, "yyyy-MM-dd"),
    });
    setAssigning(false);
    if (error) return toast.error(error.message);
    toast.success("Task assigned");
    setDNotes(""); setDWorker(""); setDHospital("");
    load();
  }

  const cards = [
    { label: "Total Visits", value: totals.visits },
    { label: "Travel", value: `₹${totals.travel.toFixed(0)}` },
    { label: "Food", value: `₹${totals.food.toFixed(0)}` },
    { label: "Lodge", value: `₹${totals.lodge.toFixed(0)}` },
  ];

  return (
    <Tabs defaultValue="reports" className="w-full">
      <TabsList className="grid grid-cols-2 mx-3 sm:mx-0 rounded-none border-2 border-slate-900/10 bg-slate-100">
        <TabsTrigger value="reports" className="rounded-none font-bold">Reports</TabsTrigger>
        <TabsTrigger value="dispatch" className="rounded-none font-bold">Team Dispatch</TabsTrigger>
      </TabsList>

      <TabsContent value="reports" className="mt-3 space-y-4 px-3 sm:px-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className="border-2 border-slate-900/10 rounded-none shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Filter by city or staff name…" value={q} onChange={(e) => setQ(e.target.value)} className="border-2" />
          <Button onClick={exportCsv} className="bg-slate-900 hover:bg-slate-800 rounded-none font-bold">
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>

        <Card className="border-2 border-slate-900/10 rounded-none shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900">
                  <TableHead className="text-white font-bold">Visit Date</TableHead>
                  <TableHead className="text-white font-bold">Staff</TableHead>
                  <TableHead className="text-white font-bold">Hospital</TableHead>
                  <TableHead className="text-white font-bold">Person</TableHead>
                  <TableHead className="text-white font-bold">Outcome</TableHead>
                  <TableHead className="text-white font-bold text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No visits yet</TableCell></TableRow>
                ) : filtered.map((r) => {
                  const total = Number(r.travel_expense) + Number(r.food_expense) + Number(r.lodge_expense);
                  return (
                    <TableRow key={r.id} className="border-b border-slate-900/10">
                      <TableCell className="whitespace-nowrap">{r.visit_date ?? r.date}</TableCell>
                      <TableCell className="font-semibold">{r.staff_profiles?.staff_name ?? "—"}</TableCell>
                      <TableCell><div className="font-medium">{r.h_master?.h_name}</div><div className="text-xs text-slate-500">{r.h_master?.branch_area}, {r.h_master?.city}</div></TableCell>
                      <TableCell>{r.h_contacts?.contact_name ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.outcome_notes}</TableCell>
                      <TableCell className="text-right font-bold">₹{total.toFixed(0)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="dispatch" className="mt-3 px-3 sm:px-0">
        <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
          <CardHeader className="border-b-2 border-slate-900/10">
            <CardTitle className="text-2xl font-bold tracking-tight">Team Dispatch Calendar</CardTitle>
            <p className="text-xs text-slate-500">Pick a future date, assign a worker and hospital, then dispatch.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={dispatchDate}
                onSelect={setDispatchDate}
                modifiers={{ scheduled: taskDates }}
                modifiersClassNames={{
                  scheduled: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-red-600",
                }}
                className={cn("p-3 pointer-events-auto border-2 border-slate-900/10 rounded-none")}
              />
            </div>

            <div className="border-2 border-slate-900/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Assign for</p>
                <p className="text-sm font-black">{dispatchDate ? format(dispatchDate, "PPP") : "—"}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Worker</Label>
                <Select value={dWorker} onValueChange={setDWorker}>
                  <SelectTrigger className="border-2"><SelectValue placeholder="Select worker" /></SelectTrigger>
                  <SelectContent>
                    {workers.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-slate-500">No workers found</div>
                    ) : workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.staff_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Target Hospital</Label>
                <Select value={dHospital} onValueChange={setDHospital}>
                  <SelectTrigger className="border-2"><SelectValue placeholder="Select hospital" /></SelectTrigger>
                  <SelectContent>
                    {hospitals.map((h) => <SelectItem key={h.id} value={h.id}>{h.h_name} — {h.branch_area}, {h.city}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Task Notes / Objective</Label>
                <Textarea rows={3} className="border-2" value={dNotes} onChange={(e) => setDNotes(e.target.value)} placeholder="What should the worker accomplish?" />
              </div>
              <Button onClick={assignTask} disabled={assigning} className="w-full h-12 font-bold rounded-none bg-slate-900 hover:bg-slate-800">
                <Send className="h-4 w-4 mr-2" />{assigning ? "Assigning…" : "Assign Task"}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Scheduled on {dispatchDate ? format(dispatchDate, "PPP") : "—"}
              </h3>
              {tasksOnDispatch.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-4 border-2 border-dashed border-slate-900/10">No tasks scheduled</p>
              ) : tasksOnDispatch.map((t) => (
                <div key={t.id} className="border-2 border-slate-900/10 p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black">{t.worker?.staff_name ?? "—"}</p>
                      <p className="text-xs text-slate-600">{t.h_master?.h_name} · {t.h_master?.branch_area}, {t.h_master?.city}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-900 text-white">{t.status}</span>
                  </div>
                  <p className="mt-2 text-slate-700">{t.task_notes}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
