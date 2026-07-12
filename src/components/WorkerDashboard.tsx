import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddHospitalDialog } from "./AddHospitalDialog";
import { AddContactDialog } from "./AddContactDialog";

type Hospital = { id: string; h_name: string; branch_area: string; city: string };
type Contact = { id: string; contact_name: string; posting_designation: string };

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
  const [submitting, setSubmitting] = useState(false);

  async function loadHospitals() {
    const { data } = await supabase.from("h_master").select("*").order("h_name");
    setHospitals(data ?? []);
  }
  async function loadContacts(hid: string) {
    if (!hid) return setContacts([]);
    const { data } = await supabase.from("h_contacts").select("id,contact_name,posting_designation").eq("h_id", hid).order("contact_name");
    setContacts(data ?? []);
  }

  useEffect(() => { loadHospitals(); }, []);
  useEffect(() => { loadContacts(hospitalId); setContactId(""); }, [hospitalId]);

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
    <Card className="border-2 border-slate-900/10 shadow-none rounded-none sm:rounded-lg">
      <CardHeader className="border-b-2 border-slate-900/10">
        <CardTitle className="text-2xl font-bold tracking-tight">Log New Field Visit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
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
  );
}
