
-- Add visit_date to daily_visit_logs
ALTER TABLE public.daily_visit_logs
  ADD COLUMN IF NOT EXISTS visit_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create assigned_tasks table
CREATE TABLE public.assigned_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_by UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  worker_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  h_id UUID NOT NULL REFERENCES public.h_master(id) ON DELETE RESTRICT,
  task_notes TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assigned_tasks TO authenticated;
GRANT ALL ON public.assigned_tasks TO service_role;

ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

-- Workers see their own tasks; admins see all
CREATE POLICY at_select_own_or_admin ON public.assigned_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = worker_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins insert
CREATE POLICY at_insert_admin ON public.assigned_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = assigned_by);

-- Admin can update all; workers can update status of their own tasks
CREATE POLICY at_update_admin_or_worker ON public.assigned_tasks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = worker_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = worker_id);

CREATE POLICY at_delete_admin ON public.assigned_tasks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_assigned_tasks_worker_date ON public.assigned_tasks(worker_id, scheduled_date);
