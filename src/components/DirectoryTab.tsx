import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AddHospitalDialog } from "./AddHospitalDialog";
import { AddContactDialog } from "./AddContactDialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Hospital = { id: string; h_name: string; branch_area: string; city: string };
type Contact = { id: string; h_id: string; contact_name: string; posting_designation: string; phone_number: string | null };

export function DirectoryTab() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selHospital, setSelHospital] = useState<string>("");

  const [editH, setEditH] = useState<Hospital | null>(null);
  const [editC, setEditC] = useState<Contact | null>(null);

  async function loadHospitals() {
    const { data, error } = await supabase.from("h_master").select("*").order("h_name");
    if (error) return toast.error(error.message);
    setHospitals(data ?? []);
  }
  async function loadContacts(hid: string) {
    if (!hid) return setContacts([]);
    const { data, error } = await supabase.from("h_contacts").select("*").eq("h_id", hid).order("contact_name");
    if (error) return toast.error(error.message);
    setContacts(data ?? []);
  }

  useEffect(() => { loadHospitals(); }, []);
  useEffect(() => { loadContacts(selHospital); }, [selHospital]);

  async function delHospital(id: string) {
    if (!confirm("Delete this hospital? This will also delete its contacts and block deletion if visit logs exist.")) return;
    const { error } = await supabase.from("h_master").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Hospital deleted");
    if (selHospital === id) setSelHospital("");
    loadHospitals();
  }
  async function delContact(id: string) {
    if (!confirm("Delete this contact?")) return;
    const { error } = await supabase.from("h_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contact deleted");
    loadContacts(selHospital);
  }

  async function saveHospital() {
    if (!editH) return;
    const { error } = await supabase.from("h_master").update({
      h_name: editH.h_name, branch_area: editH.branch_area, city: editH.city,
    }).eq("id", editH.id);
    if (error) return toast.error(error.message);
    toast.success("Hospital updated");
    setEditH(null);
    loadHospitals();
  }
  async function saveContact() {
    if (!editC) return;
    const { error } = await supabase.from("h_contacts").update({
      contact_name: editC.contact_name,
      posting_designation: editC.posting_designation,
      phone_number: editC.phone_number || null,
    }).eq("id", editC.id);
    if (error) return toast.error(error.message);
    toast.success("Contact updated");
    setEditC(null);
    loadContacts(selHospital);
  }

  return (
    <div className="space-y-4 px-3 sm:px-0">
      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">Hospitals Directory</CardTitle>
          <AddHospitalDialog onCreated={() => loadHospitals()} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900">
                  <TableHead className="text-white font-bold">Hospital</TableHead>
                  <TableHead className="text-white font-bold">Branch</TableHead>
                  <TableHead className="text-white font-bold">City</TableHead>
                  <TableHead className="text-white font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospitals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">No hospitals</TableCell></TableRow>
                ) : hospitals.map((h) => (
                  <TableRow
                    key={h.id}
                    onClick={() => setSelHospital(h.id)}
                    className={`border-b border-slate-900/10 cursor-pointer ${selHospital === h.id ? "bg-slate-100" : ""}`}
                  >
                    <TableCell className="font-semibold">{h.h_name}</TableCell>
                    <TableCell>{h.branch_area}</TableCell>
                    <TableCell>{h.city}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditH(h); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); delHospital(h.id); }}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Contacts Directory</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {selHospital ? `Showing contacts for ${hospitals.find(h => h.id === selHospital)?.h_name}` : "Click a hospital above to view its contacts"}
            </p>
          </div>
          <AddContactDialog hospitalId={selHospital || null} onCreated={() => loadContacts(selHospital)} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900">
                  <TableHead className="text-white font-bold">Name</TableHead>
                  <TableHead className="text-white font-bold">Designation</TableHead>
                  <TableHead className="text-white font-bold">Phone</TableHead>
                  <TableHead className="text-white font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selHospital ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">Pick a hospital</TableCell></TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">No contacts yet</TableCell></TableRow>
                ) : contacts.map((c) => (
                  <TableRow key={c.id} className="border-b border-slate-900/10">
                    <TableCell className="font-semibold">{c.contact_name}</TableCell>
                    <TableCell>{c.posting_designation}</TableCell>
                    <TableCell>{c.phone_number ?? "—"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setEditC(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => delContact(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editH} onOpenChange={(o) => !o && setEditH(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Hospital</DialogTitle></DialogHeader>
          {editH && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editH.h_name} onChange={(e) => setEditH({ ...editH, h_name: e.target.value })} /></div>
              <div><Label>Branch / Area</Label><Input value={editH.branch_area} onChange={(e) => setEditH({ ...editH, branch_area: e.target.value })} /></div>
              <div><Label>City</Label><Input value={editH.city} onChange={(e) => setEditH({ ...editH, city: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveHospital}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editC} onOpenChange={(o) => !o && setEditC(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          {editC && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editC.contact_name} onChange={(e) => setEditC({ ...editC, contact_name: e.target.value })} /></div>
              <div><Label>Designation</Label><Input value={editC.posting_designation} onChange={(e) => setEditC({ ...editC, posting_designation: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editC.phone_number ?? ""} onChange={(e) => setEditC({ ...editC, phone_number: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveContact}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
