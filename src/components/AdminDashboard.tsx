import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  date: string;
  outcome_notes: string;
  travel_expense: number;
  food_expense: number;
  lodge_expense: number;
  purpose: string;
  h_master: { h_name: string; branch_area: string; city: string } | null;
  h_contacts: { contact_name: string } | null;
  staff_profiles: { staff_name: string } | null;
};

export function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_visit_logs")
      .select("id,date,outcome_notes,travel_expense,food_expense,lodge_expense,purpose,h_master(h_name,branch_area,city),h_contacts(contact_name),staff_profiles(staff_name)")
      .order("date", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
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

  function exportCsv() {
    const headers = ["Date", "Staff", "Hospital", "Branch", "City", "Person Met", "Purpose", "Outcome", "Travel", "Food", "Lodge", "Total"];
    const lines = filtered.map((r) => {
      const total = Number(r.travel_expense) + Number(r.food_expense) + Number(r.lodge_expense);
      return [r.date, r.staff_profiles?.staff_name ?? "", r.h_master?.h_name ?? "", r.h_master?.branch_area ?? "",
              r.h_master?.city ?? "", r.h_contacts?.contact_name ?? "", r.purpose, r.outcome_notes,
              r.travel_expense, r.food_expense, r.lodge_expense, total]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `visits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const cards = [
    { label: "Total Visits", value: totals.visits },
    { label: "Travel", value: `₹${totals.travel.toFixed(0)}` },
    { label: "Food", value: `₹${totals.food.toFixed(0)}` },
    { label: "Lodge", value: `₹${totals.lodge.toFixed(0)}` },
  ];

  return (
    <div className="space-y-4">
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
                <TableHead className="text-white font-bold">Date</TableHead>
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
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
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
    </div>
  );
}
