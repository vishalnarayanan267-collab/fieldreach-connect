import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/", replace: true });
  }

  async function signUp() {
    if (!name.trim()) return toast.error("Enter your name");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { staff_name: name }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/", replace: true });
  }

  const PasswordField = (
    <div>
      <Label className="font-semibold">Password</Label>
      <div className="relative">
        <Input
          className="border-2 pr-10"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-500 hover:text-slate-900"
        >
          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
      <Toaster position="top-center" />
      <Card className="w-full max-w-md border-2 border-slate-900 rounded-none shadow-none">
        <CardHeader className="border-b-2 border-slate-900/10">
          <CardTitle className="text-2xl font-black tracking-tight">Lifecare Portal</CardTitle>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Sign in once — stays signed in</p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 rounded-none border-2 border-slate-900/10 bg-slate-100">
              <TabsTrigger value="signin" className="rounded-none font-bold">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none font-bold">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-3 pt-4">
              <div><Label className="font-semibold">Email</Label><Input className="border-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              {PasswordField}
              <Button onClick={signIn} disabled={busy} className="w-full h-12 font-bold rounded-none bg-slate-900 hover:bg-slate-800">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 pt-4">
              <div><Label className="font-semibold">Full Name</Label><Input className="border-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label className="font-semibold">Email</Label><Input className="border-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              {PasswordField}
              <Button onClick={signUp} disabled={busy} className="w-full h-12 font-bold rounded-none bg-slate-900 hover:bg-slate-800">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>
              <p className="text-xs text-slate-500">New accounts start as <b>Worker</b>. Admin can promote to accountant/admin.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
