import { supabase } from "@/integrations/supabase/client";

const DEMO_WORKER = { email: "worker@lifecare.local", password: "demo-worker-2026", name: "Demo Worker" };
const DEMO_ADMIN = { email: "admin@lifecare.local", password: "demo-admin-2026", name: "Demo Admin" };

async function ensureAccount(creds: { email: string; password: string; name: string }) {
  const { error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
  if (!error) return;
  const { error: signUpError } = await supabase.auth.signUp({
    email: creds.email,
    password: creds.password,
    options: { data: { staff_name: creds.name } },
  });
  if (signUpError && !/already/i.test(signUpError.message)) throw signUpError;
  await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
}

export async function ensureDemoSession(role: "worker" | "admin") {
  const target = role === "admin" ? DEMO_ADMIN : DEMO_WORKER;
  const { data } = await supabase.auth.getUser();
  if (data.user?.email === target.email) return;
  if (data.user) await supabase.auth.signOut();
  await ensureAccount(target);
}
