
-- 1. Add accountant role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';

-- 2. Expense simplification + geo on visit logs
ALTER TABLE public.daily_visit_logs
  ADD COLUMN IF NOT EXISTS expense_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_category TEXT,
  ADD COLUMN IF NOT EXISTS expense_custom_reason TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

ALTER TABLE public.daily_visit_logs
  DROP CONSTRAINT IF EXISTS daily_visit_logs_expense_category_check;
ALTER TABLE public.daily_visit_logs
  ADD CONSTRAINT daily_visit_logs_expense_category_check
  CHECK (expense_category IS NULL OR expense_category IN ('Petrol','Food','Lodge','Other'));

-- 3. Geo + completion on tasks
ALTER TABLE public.assigned_tasks
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 4. staff_locations ledger
CREATE TABLE IF NOT EXISTS public.staff_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  accuracy NUMERIC(10,2),
  source TEXT NOT NULL CHECK (source IN ('visit_log','task_update','manual')),
  related_id UUID,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_time ON public.staff_locations(staff_id, captured_at DESC);
GRANT SELECT, INSERT ON public.staff_locations TO authenticated;
GRANT ALL ON public.staff_locations TO service_role;
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers insert own location"
  ON public.staff_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "Workers read own location"
  ON public.staff_locations FOR SELECT TO authenticated
  USING (auth.uid() = staff_id);
CREATE POLICY "Admins read all locations"
  ON public.staff_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  h_id UUID NOT NULL REFERENCES public.h_master(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid','Partial','Paid','Overdue','Cancelled')),
  notes TEXT,
  created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff delete invoices" ON public.invoices FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 6. Collections (payments against invoices)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  collected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT CHECK (method IN ('Cash','Bank Transfer','UPI','Cheque','Card','Other')),
  reference_note TEXT,
  collected_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collections_invoice ON public.collections(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read collections" ON public.collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update collections" ON public.collections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff delete collections" ON public.collections FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 7. Expense verification flag on visit logs
ALTER TABLE public.daily_visit_logs
  ADD COLUMN IF NOT EXISTS expense_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expense_verified_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expense_verified_at TIMESTAMPTZ;
