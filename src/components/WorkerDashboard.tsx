import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddHospitalDialog } from "./AddHospitalDialog";
import { AddContactDialog } from "./AddContactDialog";
import { DirectoryTab } from "./DirectoryTab";
import { WorkerLeaves } from "./WorkerLeaves";
import { CalendarIcon, MapPin, Target, UserRound, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { captureCoords, logStaffLocation } from "@/lib/geolocation";
import { downloadIcs } from "@/lib/ics";

type Hospital = { id: string; h_name: string; branch_area: string; city: string };
type Contact = { id: string; contact_name: string; posting_designation: string };
type Task = {
  id: string;
  scheduled_date: string;
  task_notes: string;
  status: string;
  h_master: { h_name: string; branch_area: string; city: string } | null;
  assigner: { staff_name: string } | null;
};

const PURPOSES = ["Product Demo", "New Order Taking", "Payment Collection", "Relationship Building"] as const;
const CATEGORIES = ["Petrol", "Food", "Lodge", "Other"] as const;

export function WorkerDashboard() {
  const [uid, setUid] = useState<string>("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hospitalId, setHospitalId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [purpose, setPurpose] = useState<typeof PURPOSES[number] | "">("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState<typeof CATEGORIES[number] | "">("");
  const [customReason, setCustomReason] = useState("");
  const [visitDate, setVisitDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);

  async function loadHospitals() {
    const { data } = await supabase.from("h_master").select("*").order("h_name");
    setHospitals(data ?? []);
  }
  async function loadContacts(hid: string) {
    if (!hid) { setContacts([]); return; }
    const { data } = await supabase.from("h_contacts")
      .select("id,contact_name,posting_designation")
      .eq("h_id", hid).order("contact_name");
    setContacts(data ?? []);
  }
  async function loadTasks() {
    const { data } = await supabase
      .from("assigned_tasks")
      .select("id,scheduled_date,task_notes,status,h_master(h_name,branch_area,city),assigner:staff_profiles!assigned_tasks_assigned_by_fkey(staff_name)")
      .order("scheduled_date", { ascending: true });
    setTasks((data as unknown as Task[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUid(data.user.id);
    })();
    loadHospitals();
    loadTasks();
  }, []);

  // CRITICAL: strict cascading — clear contact whenever hospital changes.
  useEffect(() => {
    setContactId("");
    loadContacts(hospitalId);
  }, [hospitalId]);

  async function submit() {
    if (!hospitalId || !purpose || !notes.trim()) return toast.error("Hospital, purpose & notes required");
    if (Number(amount) > 0 && !category) return toast.error("Pick an expense category");
    if (category === "Other" && !customReason.trim()) return toast.error("Describe the 'Other' expense");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");

    setSubmitting(true);
    const coords = await captureCoords();
    const { data: inserted, error } = await supabase.from("daily_visit_logs").insert({
      staff_id: u.user.id,
      h_id: hospitalId,
      contact_met_id: contactId || null,
      purpose,
      outcome_notes: notes,
      visit_date: format(visitDate, "yyyy-MM-dd"),
      expense_amount: Number(amount) || 0,
      expense_category: Number(amount) > 0 ? category : null,
      expense_custom_reason: category === "Other" ? customReason : null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (coords) {
      await logStaffLocation({ staffId: u.user.id, coords, source: "visit_log", relatedId: inserted?.id });
    }
    toast.success("Visit logged");
    setContactId(""); setPurpose(""); setNotes("");
    setAmount("0"); setCategory(""); setCustomReason("");
  }

  async function markCompleted(t: Task) {
    const { data: u } = await supabase.auth.getUser();
    const coords = await captureCoords();
    const { error } = await supabase.from("assigned_tasks").update({
      status: "Completed",
      completed_at: new Date().toISOString(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    if (coords && u.user) {
      await logStaffLocation({ staffId: u.user.id, coords, source: "task_update", relatedId: t.id });
    }
    toast.success("Marked completed");
    loadTasks();
  }

  function addTaskToCalendar(t: Task) {
    downloadIcs({
      uid: `task-${t.id}`,
      title: `Field Visit: ${t.h_master?.h_name ?? "Hospital"}`,
      description: `Objective: ${t.task_notes}\nAssigned by: ${t.assigner?.staff_name ?? "Admin"}`,
      location: t.h_master ? `${t.h_master.h_name}, ${t.h_master.branch_area}, ${t.h_master.city}` : undefined,
      startDate: t.scheduled_date,
    });
    toast.success("Opening in your calendar");
  }

  return (
    <Tabs defaultValue="log" className="w-full">
      <TabsList className="grid grid-cols-4 mx-3 sm:mx-0 rounded-none border-2 border-slate-900/10 bg-slate-100">
        <TabsTrigger value="log" className="rounded-none font-bold text-xs sm:text-sm">Log Visit</TabsTrigger>
        <TabsTrigger value="tasks" className="rounded-none font-bold text-xs sm:text-sm">My Tasks</TabsTrigger>
        <TabsTrigger value="directory" className="rounded-none font-bold text-xs sm:text-sm">Directory</TabsTrigger>
        <TabsTrigger value="leaves" className="rounded-none font-bold text-xs sm:text-sm">Leaves</TabsTrigger>
      </TabsList>

      <TabsContent value="log" className="mt-3">
        <Card className="border-2 border-slate-900/10 shadow-none rounded-none sm:rounded-lg">
          <CardHeader className="border-b-2 border-slate-900/10">
            <CardTitle className="text-2xl font-bold tracking-tight">Log New Field Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label className="font-semibold">Actual Date of Meeting</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start border-2 rounded-none font-semibold")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {visitDate ? format(visitDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={visitDate} onSelect={(d) => d && setVisitDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Hospital</Label>
              <div className="flex gap-2">
                <Select value={hospitalId} onValueChange={setHospitalId}>
                  <SelectTrigger className="border-2"><SelectValue placeholder="Select hospital" /></SelectTrigger>
                  <SelectContent>
                    {hospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.h_name} — {h.branch_area}, {h.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AddHospitalDialog onCreated={async (id) => { await loadHospitals(); setHospitalId(id); }} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Person Met</Label>
              <div className="flex gap-2">
                <Select value={contactId} onValueChange={setContactId} disabled={!hospitalId}>
                  <SelectTrigger className="border-2"><SelectValue placeholder={hospitalId ? "Select contact" : "Pick hospital first"} /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.contact_name} — {c.posting_designation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AddContactDialog hospitalId={hospitalId || null} onCreated={async (id) => { await loadContacts(hospitalId); setContactId(id); }} />
              </div>
              {hospitalId && contacts.length === 0 && (
                <p className="text-xs text-slate-500">No contacts for this hospital — use + to add.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Purpose</Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as typeof PURPOSES[number])}>
                <SelectTrigger className="border-2"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Outcome Notes</Label>
              <Textarea rows={4} className="border-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened during the visit…" />
            </div>

            <div className="border-t-2 border-slate-900/10 pt-4 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Expense</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof CATEGORIES[number])}>
                    <SelectTrigger className="border-2"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input inputMode="decimal" className="border-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              {category === "Other" && (
                <div>
                  <Label className="text-xs">Specify Reason</Label>
                  <Input className="border-2" value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="e.g. Toll, parking, courier…" />
                </div>
              )}
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full h-12 text-base font-bold bg-slate-900 hover:bg-slate-800 rounded-none">
              {submitting ? "Submitting…" : "Submit Visit Log"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tasks" className="mt-3 px-3 sm:px-0">
        <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
          <CardHeader className="border-b-2 border-slate-900/10">
            <CardTitle className="text-2xl font-bold tracking-tight">My Assigned Tasks</CardTitle>
            <p className="text-xs text-slate-500">Tap "Add to Calendar" to sync with Google Calendar on your phone.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {tasks.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">No tasks assigned</p>
            ) : tasks.map((t) => (
              <div key={t.id} className="border-2 border-slate-900/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{t.scheduled_date}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-900 text-white">{t.status}</span>
                </div>
                <div className="flex items-start gap-2"><UserRound className="h-4 w-4 mt-0.5 text-slate-700 shrink-0" />
                  <div className="text-sm"><span className="font-bold">Assigned by:</span> {t.assigner?.staff_name ?? "Admin"}</div></div>
                <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-slate-700 shrink-0" />
                  <div className="text-sm"><div className="font-bold">{t.h_master?.h_name}</div>
                    <div className="text-xs text-slate-600">{t.h_master?.branch_area}, {t.h_master?.city}</div></div></div>
                <div className="flex items-start gap-2"><Target className="h-4 w-4 mt-0.5 text-slate-700 shrink-0" />
                  <div className="text-sm"><span className="font-bold">Objective:</span> {t.task_notes}</div></div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => addTaskToCalendar(t)}
                    className="rounded-none font-bold border-2 border-slate-900">
                    <Download className="h-4 w-4 mr-1" />Add to Calendar
                  </Button>
                  {t.status !== "Completed" ? (
                    <Button size="sm" onClick={() => markCompleted(t)}
                      className="rounded-none font-bold bg-emerald-600 hover:bg-emerald-700">
                      Mark Completed
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 flex items-center justify-center">✓ Done</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="directory" className="mt-3">
        <DirectoryTab />
      </TabsContent>

      <TabsContent value="leaves" className="mt-3">
        <WorkerLeaves />
      </TabsContent>
    </Tabs>
  );
}
