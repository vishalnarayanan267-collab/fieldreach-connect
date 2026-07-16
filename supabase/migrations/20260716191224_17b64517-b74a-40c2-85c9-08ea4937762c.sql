
-- Enums for leave management
DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM ('Sick Leave', 'Personal Work Leave', 'Mid-Day Offsite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_duration AS ENUM ('Full Day', 'Half Day', 'Hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM ('Pending', 'Approved', 'Rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Leaves table
CREATE TABLE IF NOT EXISTS public.staff_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  duration_type public.leave_duration NOT NULL,
  hours_needed NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason_notes TEXT NOT NULL,
  status public.leave_status NOT NULL DEFAULT 'Pending',
  reviewed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_leaves TO authenticated;
GRANT ALL ON public.staff_leaves TO service_role;

ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_select_own_or_admin" ON public.staff_leaves
  FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sl_insert_own" ON public.staff_leaves
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "sl_update_own_pending_or_admin" ON public.staff_leaves
  FOR UPDATE TO authenticated
  USING (
    (staff_id = auth.uid() AND status = 'Pending')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "sl_delete_own_pending_or_admin" ON public.staff_leaves
  FOR DELETE TO authenticated
  USING (
    (staff_id = auth.uid() AND status = 'Pending')
    OR public.has_role(auth.uid(), 'admin')
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_staff_leaves_updated_at ON public.staff_leaves;
CREATE TRIGGER trg_staff_leaves_updated_at
  BEFORE UPDATE ON public.staff_leaves
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Allow any authenticated user to delete hospitals/contacts (for directory corrections)
DROP POLICY IF EXISTS hm_delete_admin ON public.h_master;
CREATE POLICY "hm_delete_auth" ON public.h_master
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS hc_delete_admin ON public.h_contacts;
CREATE POLICY "hc_delete_auth" ON public.h_contacts
  FOR DELETE TO authenticated USING (true);
