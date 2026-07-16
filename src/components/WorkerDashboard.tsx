import { useEffect, useMemo, useState } from "react";
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
import { CalendarIcon, MapPin, Target, UserRound } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

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

export function WorkerDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hospitalId, setHospitalId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [purpose, setPurpose] = useState<typeof PURPOSES[number] | "">("");
  const [notes, setNotes] = useState("");
  const [travel, setTravel] = useState("0");
  const [food, setFood] = useState("0");
  const [lodge, setLodge] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [visitDate, setVisitDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [calDate, setCalDate] = useState<Date | undefined>(new Date());

  async function loadHospitals() {
    const { data } = await supabase.from("h_master").select("*").order("h_name");
    setHospitals(data ?? []);
  }
  async function loadContacts(hid: string) {
    if (!hid) return setContacts([]);
    const { data } = await supabase.from("h_contacts").select("id,contact_name,posting_designation").eq("h_id", hid).order("contact_name");
    setContacts(data ?? []);
  }
  async function loadTasks() {
    const { data } = await supabase
      .from("assigned_tasks")
      .select("id,scheduled_date,task_notes,status,h_master(h_name,branch_area,city),assigner:staff_profiles!assigned_tasks_assigned_by_fkey(staff_name)")
      .order("scheduled_date", { ascending: true });
    setTasks((data as unknown as Task[]) ?? []);
  }

  useEffect(() => { loadHospitals(); loadTasks(); }, []);
  useEffect(() => { loadContacts(hospitalId); setContactId(""); }, [hospitalId]);

  const taskDates = useMemo(() => tasks.map((t) => new Date(t.scheduled_date + "T00:00:00")), [tasks]);
  const tasksOnSelected = useMemo(() => {
    if (!calDate) return [];
    return tasks.filter((t) => isSameDay(new Date(t.scheduled_date + "T00:00:00"), calDate));
  }, [tasks, calDate]);

  async function submit() {
    if (!hospitalId || !purpose || !notes.trim()) return toast.error("Hospital, purpose & notes required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    setSubmitting(true);
    const { error } = await supabase.from("daily_visit_logs").insert({
      staff_id: u.user.id,
      h_id: hospitalId,
      contact_met_id: contactId || null,
      purpose,
      outcome_notes: notes,
      visit_date: format(visitDate, "yyyy-MM-dd"),
      travel_expense: Number(travel) || 0,
      food_expense: Number(food) || 0,
      lodge_expense: Number(lodge) || 0,
      expense_remarks: remarks || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Visit logged");
    setContactId(""); setPurpose(""); setNotes(""); setTravel("0"); setFood("0"); setLodge("0"); setRemarks("");
  }

  return (
    <Tabs defaultValue="log" className="w-full">
      <TabsList className="grid grid-cols-2 mx-3 sm:mx-0 rounded-none border-2 border-slate-900/10 bg-slate-100">
        <TabsTrigger value="log" className="rounded-none font-bold">Log Visit</TabsTrigger>
        <TabsTrigger value="calendar" className="rounded-none font-bold">My Calendar</TabsTrigger>
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
                  <Button variant="outline" className={cn("w-full justify-start border-2 rounded-none font-semibold", !visitDate && "text-muted-foreground")}>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Expenses</h3>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Travel</Label><Input inputMode="decimal" className="border-2" value={travel} onChange={(e) => setTravel(e.target.value)} /></div>
                <div><Label className="text-xs">Food</Label><Input inputMode="decimal" className="border-2" value={food} onChange={(e) => setFood(e.target.value)} /></div>
                <div><Label className="text-xs">Lodge</Label><Input inputMode="decimal" className="border-2" value={lodge} onChange={(e) => setLodge(e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">Remarks</Label><Input className="border-2" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional expense notes" /></div>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full h-12 text-base font-bold bg-slate-900 hover:bg-slate-800 rounded-none">
              {submitting ? "Submitting…" : "Submit Visit Log"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calendar" className="mt-3">
        <Card className="border-2 border-slate-900/10 shadow-none rounded-none sm:rounded-lg">
          <CardHeader className="border-b-2 border-slate-900/10">
            <CardTitle className="text-2xl font-bold tracking-tight">Assigned Tasks</CardTitle>
            <p className="text-xs text-slate-500">Days with a red dot have tasks from your admin.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={calDate}
                onSelect={setCalDate}
                modifiers={{ assigned: taskDates }}
                modifiersClassNames={{
                  assigned: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-red-600",
                }}
                className={cn("p-3 pointer-events-auto border-2 border-slate-900/10 rounded-none")}
              />
            </div>

            <div className="space-y-3">
              {tasksOnSelected.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">
                  {calDate ? `No tasks on ${format(calDate, "PPP")}` : "Pick a date to see tasks"}
                </p>
              ) : tasksOnSelected.map((t) => (
                <Card key={t.id} className="border-2 border-red-600/40 rounded-none shadow-none bg-red-50/40">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-700">Reminder</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-900 text-white">{t.status}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <UserRound className="h-4 w-4 mt-0.5 text-slate-700 shrink-0" />
                      <div className="text-sm"><span className="font-bold">Assigned by:</span> {t.assigner?.staff_name ?? "Admin"}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-slate-700 shrink-0" />
                      <div className="text-sm">
                        <div className="font-bold">{t.h_master?.h_name}</div>
                        <div className="text-xs text-slate-600">{t.h_master?.branch_area}, {t.h_master?.city}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 mt-0.5 text-slate-700 shrink-0" />
                      <div className="text-sm"><span className="font-bold">Objective:</span> {t.task_notes}</div>
                    </div>
                    {t.status !== "Completed" && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-slate-900 hover:bg-slate-800 rounded-none font-bold"
                        onClick={async () => {
                          const { error } = await supabase.from("assigned_tasks").update({ status: "Completed" }).eq("id", t.id);
                          if (error) return toast.error(error.message);
                          toast.success("Marked completed");
                          loadTasks();
                        }}
                      >
                        Mark Completed
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
