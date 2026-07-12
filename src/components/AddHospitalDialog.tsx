import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AddHospitalDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h_name, setName] = useState("");
  const [branch_area, setBranch] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!h_name || !branch_area || !city) return toast.error("Fill all fields");
    setSaving(true);
    const { data, error } = await supabase
      .from("h_master")
      .insert({ h_name, branch_area, city })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Hospital added");
    onCreated(data.id);
    setOpen(false);
    setName(""); setBranch(""); setCity("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="outline" className="shrink-0 border-2">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Hospital Branch</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Hospital Name</Label><Input value={h_name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Branch / Area</Label><Input value={branch_area} onChange={(e) => setBranch(e.target.value)} /></div>
          <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save Hospital"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
