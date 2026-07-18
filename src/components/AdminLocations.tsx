import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Loc = {
  id: string;
  staff_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: string;
  captured_at: string;
  staff_profiles: { staff_name: string } | null;
};

export function AdminLocations() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("staff_locations")
        .select("*,staff_profiles(staff_name)")
        .order("captured_at", { ascending: false }).limit(200);
      setLocs((data as unknown as Loc[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const latestByStaff = useMemo(() => {
    const map = new Map<string, Loc>();
    for (const l of locs) if (!map.has(l.staff_id)) map.set(l.staff_id, l);
    return Array.from(map.values());
  }, [locs]);

  return (
    <div className="space-y-4 px-3 sm:px-0">
      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10">
          <CardTitle className="text-xl font-bold">Latest Field Pings</CardTitle>
          <p className="text-xs text-slate-500">Captured on visit submit & task status updates.</p>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-6">Loading…</p>
          ) : latestByStaff.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">No location pings yet</p>
          ) : latestByStaff.map((l) => (
            <div key={l.id} className="border-2 border-slate-900/10 p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-sm flex items-center gap-1.5"><MapPin className="h-4 w-4 text-red-600" />{l.staff_profiles?.staff_name ?? "—"}</p>
                <p className="text-xs text-slate-600 mt-0.5">{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)} · {l.source}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatDistanceToNow(new Date(l.captured_at), { addSuffix: true })}</p>
              </div>
              <a href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`} target="_blank" rel="noreferrer"
                className="text-xs font-bold uppercase tracking-wider text-slate-900 border-2 border-slate-900 px-2 py-1 hover:bg-slate-900 hover:text-white inline-flex items-center gap-1">
                Map <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-900/10 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10">
          <CardTitle className="text-lg font-bold">Recent History</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1 text-xs">
          {locs.slice(0, 30).map(l => (
            <div key={l.id} className="flex justify-between border-b border-slate-900/10 py-1">
              <span className="font-semibold">{l.staff_profiles?.staff_name}</span>
              <span className="text-slate-500">{l.source}</span>
              <span className="text-slate-500">{new Date(l.captured_at).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
