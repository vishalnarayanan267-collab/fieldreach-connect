import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Hospital = { id: string; h_name: string; branch_area: string; city: string };
type Invoice = {
  id: string;
  invoice_number: string;
  h_id: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  status: string;
  notes: string | null;
  h_master: { h_name: string; branch_area: string; city: string } | null;
};
type Collection = {
  id: string;
  invoice_id: string;
  amount: number;
  collected_date: string;
  method: string | null;
  reference_note: string | null;
  invoices: { invoice_number: string; h_master: { h_name: string } | null } | null;
};
type Expense = {
  id: string;
  visit_date: string | null;
  date: string;
  expense_amount: number;
  expense_category: string | null;
  expense_custom_reason: string | null;
  expense_remarks: string | null;
  expense_verified: boolean;
  staff_profiles: { staff_name: string } | null;
  h_master: { h_name: string; city: string } | null;
};

const STATUSES = ["Unpaid", "Partial", "Paid", "Overdue", "Cancelled"];
const METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];

export function BillingDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invOpen, setInvOpen] = useState(false);
  const [editInv, setEditInv] = useState<Invoice | null>(null);
  const [colOpen, setColOpen] = useState(false);
  const [newInv, setNewInv] = useState({ invoice_number: "", h_id: "", amount: "", due_date: "", notes: "" });
  const [newCol, setNewCol] = useState({ invoice_id: "", amount: "", method: "Cash", reference_note: "" });

  async function load() {
    const [h, i, c, e] = await Promise.all([
      supabase.from("h_master").select("id,h_name,branch_area,city").order("h_name"),
      supabase.from("invoices").select("*,h_master(h_name,branch_area,city)").order("issued_date", { ascending: false }),
      supabase.from("collections").select("*,invoices(invoice_number,h_master(h_name))").order("collected_date", { ascending: false }),
      supabase.from("daily_visit_logs")
        .select("id,date,visit_date,expense_amount,expense_category,expense_custom_reason,expense_remarks,expense_verified,staff_profiles(staff_name),h_master(h_name,city)")
        .gt("expense_amount", 0).order("visit_date", { ascending: false }),
    ]);
    setHospitals((h.data as Hospital[]) ?? []);
    setInvoices((i.data as unknown as Invoice[]) ?? []);
    setCollections((c.data as unknown as Collection[]) ?? []);
    setExpenses((e.data as unknown as Expense[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const outstanding = invoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").reduce((a, i) => a + Number(i.amount), 0);
    const collected = collections.reduce((a, c) => a + Number(c.amount), 0);
    const pendingExp = expenses.filter(e => !e.expense_verified).reduce((a, e) => a + Number(e.expense_amount), 0);
    return { outstanding, collected, pendingExp, invoiceCount: invoices.length };
  }, [invoices, collections, expenses]);

  async function saveInvoice() {
    if (!newInv.invoice_number || !newInv.h_id || !newInv.amount) return toast.error("Number, hospital, amount required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("invoices").insert({
      invoice_number: newInv.invoice_number,
      h_id: newInv.h_id,
      amount: Number(newInv.amount),
      due_date: newInv.due_date || null,
      notes: newInv.notes || null,
      created_by: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Invoice created");
    setInvOpen(false);
    setNewInv({ invoice_number: "", h_id: "", amount: "", due_date: "", notes: "" });
    load();
  }
  async function updateInvoiceStatus(id: string, status: string) {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  }
  async function saveEditInvoice() {
    if (!editInv) return;
    const { error } = await supabase.from("invoices").update({
      invoice_number: editInv.invoice_number, amount: editInv.amount,
      due_date: editInv.due_date, status: editInv.status, notes: editInv.notes,
    }).eq("id", editInv.id);
    if (error) return toast.error(error.message);
    toast.success("Invoice saved");
    setEditInv(null); load();
  }
  async function deleteInvoice(id: string) {
    if (!confirm("Delete invoice and its collections?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }

  async function saveCollection() {
    if (!newCol.invoice_id || !newCol.amount) return toast.error("Invoice + amount required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("collections").insert({
      invoice_id: newCol.invoice_id,
      amount: Number(newCol.amount),
      method: newCol.method,
      reference_note: newCol.reference_note || null,
      collected_by: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    setColOpen(false);
    setNewCol({ invoice_id: "", amount: "", method: "Cash", reference_note: "" });
    load();
  }
  async function deleteCollection(id: string) {
    if (!confirm("Delete this payment record?")) return;
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }

  async function toggleVerify(id: string, current: boolean) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("daily_visit_logs").update({
      expense_verified: !current,
      expense_verified_by: !current ? u.user?.id ?? null : null,
      expense_verified_at: !current ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const cards = [
    { label: "Invoices", value: totals.invoiceCount },
    { label: "Outstanding", value: `₹${totals.outstanding.toFixed(0)}` },
    { label: "Collected", value: `₹${totals.collected.toFixed(0)}` },
    { label: "Unverified Exp.", value: `₹${totals.pendingExp.toFixed(0)}` },
  ];

  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className="grid grid-cols-3 mx-3 sm:mx-0 rounded-none border-2 border-slate-900/10 bg-slate-100">
        <TabsTrigger value="invoices" className="rounded-none font-bold text-xs sm:text-sm">Invoices</TabsTrigger>
        <TabsTrigger value="collections" className="rounded-none font-bold text-xs sm:text-sm">Collections</TabsTrigger>
        <TabsTrigger value="verify" className="rounded-none font-bold text-xs sm:text-sm">Verify Expenses</TabsTrigger>
      </TabsList>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 px-3 sm:px-0">
        {cards.map((c) => (
          <Card key={c.label} className="border-2 border-slate-900/10 rounded-none shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TabsContent value="invoices" className="mt-3 px-3 sm:px-0">
        <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
          <CardHeader className="border-b-2 border-slate-900/10 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">Invoices</CardTitle>
            <Button onClick={() => setInvOpen(true)} className="rounded-none bg-slate-900 hover:bg-slate-800 font-bold">
              <Plus className="h-4 w-4 mr-1" />New
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-white font-bold">Number</TableHead>
                    <TableHead className="text-white font-bold">Hospital</TableHead>
                    <TableHead className="text-white font-bold text-right">Amount</TableHead>
                    <TableHead className="text-white font-bold">Due</TableHead>
                    <TableHead className="text-white font-bold">Status</TableHead>
                    <TableHead className="text-white font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-500">No invoices</TableCell></TableRow>
                  ) : invoices.map((i) => (
                    <TableRow key={i.id} className="border-b border-slate-900/10">
                      <TableCell className="font-bold">{i.invoice_number}</TableCell>
                      <TableCell>{i.h_master?.h_name} <span className="text-xs text-slate-500">· {i.h_master?.city}</span></TableCell>
                      <TableCell className="text-right font-bold">₹{Number(i.amount).toFixed(0)}</TableCell>
                      <TableCell>{i.due_date ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={i.status} onValueChange={(v) => updateInvoiceStatus(i.id, v)}>
                          <SelectTrigger className="h-8 border-2 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => setEditInv(i)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteInvoice(i.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="collections" className="mt-3 px-3 sm:px-0">
        <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
          <CardHeader className="border-b-2 border-slate-900/10 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">Payment Collections</CardTitle>
            <Button onClick={() => setColOpen(true)} className="rounded-none bg-slate-900 hover:bg-slate-800 font-bold">
              <Plus className="h-4 w-4 mr-1" />Record
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-white font-bold">Date</TableHead>
                    <TableHead className="text-white font-bold">Invoice</TableHead>
                    <TableHead className="text-white font-bold">Hospital</TableHead>
                    <TableHead className="text-white font-bold">Method</TableHead>
                    <TableHead className="text-white font-bold text-right">Amount</TableHead>
                    <TableHead className="text-white font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-500">No collections</TableCell></TableRow>
                  ) : collections.map((c) => (
                    <TableRow key={c.id} className="border-b border-slate-900/10">
                      <TableCell>{c.collected_date}</TableCell>
                      <TableCell className="font-bold">{c.invoices?.invoice_number ?? "—"}</TableCell>
                      <TableCell>{c.invoices?.h_master?.h_name ?? "—"}</TableCell>
                      <TableCell>{c.method ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold">₹{Number(c.amount).toFixed(0)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => deleteCollection(c.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="verify" className="mt-3 px-3 sm:px-0">
        <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
          <CardHeader className="border-b-2 border-slate-900/10">
            <CardTitle className="text-xl font-bold">Expense Verification Queue</CardTitle>
            <p className="text-xs text-slate-500">Accountant sign-off on field expenses.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-white font-bold">Date</TableHead>
                    <TableHead className="text-white font-bold">Staff</TableHead>
                    <TableHead className="text-white font-bold">Hospital</TableHead>
                    <TableHead className="text-white font-bold">Category</TableHead>
                    <TableHead className="text-white font-bold">Reason</TableHead>
                    <TableHead className="text-white font-bold text-right">Amount</TableHead>
                    <TableHead className="text-white font-bold text-center">Verify</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-500">No expenses</TableCell></TableRow>
                  ) : expenses.map((e) => (
                    <TableRow key={e.id} className="border-b border-slate-900/10">
                      <TableCell>{e.visit_date ?? e.date}</TableCell>
                      <TableCell className="font-semibold">{e.staff_profiles?.staff_name ?? "—"}</TableCell>
                      <TableCell>{e.h_master?.h_name ?? "—"}</TableCell>
                      <TableCell>{e.expense_category ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{e.expense_custom_reason || e.expense_remarks || "—"}</TableCell>
                      <TableCell className="text-right font-bold">₹{Number(e.expense_amount).toFixed(0)}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant={e.expense_verified ? "default" : "outline"}
                          onClick={() => toggleVerify(e.id, e.expense_verified)}
                          className={"rounded-none font-bold " + (e.expense_verified ? "bg-emerald-600 hover:bg-emerald-700" : "")}>
                          {e.expense_verified ? <><Check className="h-4 w-4 mr-1" />Verified</> : <><X className="h-4 w-4 mr-1" />Pending</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* New invoice dialog */}
      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Invoice Number</Label><Input value={newInv.invoice_number} onChange={(e) => setNewInv({ ...newInv, invoice_number: e.target.value })} /></div>
            <div><Label>Hospital</Label>
              <Select value={newInv.h_id} onValueChange={(v) => setNewInv({ ...newInv, h_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.h_name} — {h.city}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input inputMode="decimal" value={newInv.amount} onChange={(e) => setNewInv({ ...newInv, amount: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={newInv.due_date} onChange={(e) => setNewInv({ ...newInv, due_date: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={newInv.notes} onChange={(e) => setNewInv({ ...newInv, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveInvoice}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit invoice dialog */}
      <Dialog open={!!editInv} onOpenChange={(o) => !o && setEditInv(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
          {editInv && (
            <div className="space-y-3">
              <div><Label>Number</Label><Input value={editInv.invoice_number} onChange={(e) => setEditInv({ ...editInv, invoice_number: e.target.value })} /></div>
              <div><Label>Amount</Label><Input inputMode="decimal" value={String(editInv.amount)} onChange={(e) => setEditInv({ ...editInv, amount: Number(e.target.value) })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={editInv.due_date ?? ""} onChange={(e) => setEditInv({ ...editInv, due_date: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={editInv.status} onValueChange={(v) => setEditInv({ ...editInv, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={editInv.notes ?? ""} onChange={(e) => setEditInv({ ...editInv, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveEditInvoice}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New collection dialog */}
      <Dialog open={colOpen} onOpenChange={setColOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Invoice</Label>
              <Select value={newCol.invoice_id} onValueChange={(v) => setNewCol({ ...newCol, invoice_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.invoice_number} — {i.h_master?.h_name} (₹{Number(i.amount).toFixed(0)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input inputMode="decimal" value={newCol.amount} onChange={(e) => setNewCol({ ...newCol, amount: e.target.value })} /></div>
            <div><Label>Method</Label>
              <Select value={newCol.method} onValueChange={(v) => setNewCol({ ...newCol, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reference / Note</Label><Input value={newCol.reference_note} onChange={(e) => setNewCol({ ...newCol, reference_note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveCollection}>Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
