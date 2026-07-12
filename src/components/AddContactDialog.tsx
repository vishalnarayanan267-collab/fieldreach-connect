import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AddContactDialog({ hospitalId, onCreated }: { hospitalId: string | null; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [contact_name, setName] = useState("");
  const [posting_designation, setDesig] = useState("");
  const [phone_number, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!hospitalId) return toast.error("Pick a hospital first");
    if (!contact_name || !posting_designation) return toast.error("Name & designation required");
    setSaving(true);
    const { data, error } = await supabase
      .from("h_contacts")
      .insert({ h_id: hospitalId, contact_name, posting_designation, phone_number: phone_number || null })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contact added");
    onCreated(data.id);
    setOpen(false);
    setName(""); setDesig(""); setPhone("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="outline" disabled={!hospitalId} className="shrink-0 border-2">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={contact_name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Designation</Label><Input value={posting_designation} onChange={(e) => setDesig(e.target.value)} /></div>
          <div><Label>Phone (optional)</Label><Input value={phone_number} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save Contact"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
