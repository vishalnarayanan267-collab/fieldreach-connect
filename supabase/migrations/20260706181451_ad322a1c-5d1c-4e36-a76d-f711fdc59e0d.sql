
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'worker');
CREATE TYPE public.visit_purpose AS ENUM ('Product Demo', 'New Order Taking', 'Payment Collection', 'Relationship Building');

-- =========================================
-- 1) h_master
-- =========================================
CREATE TABLE public.h_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h_name TEXT NOT NULL,
  branch_area TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX h_master_unique_branch_idx
  ON public.h_master (lower(h_name), lower(branch_area), lower(city));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.h_master TO authenticated;
GRANT ALL ON public.h_master TO service_role;
ALTER TABLE public.h_master ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 2) h_contacts
-- =========================================
CREATE TABLE public.h_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h_id UUID NOT NULL REFERENCES public.h_master(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  posting_designation TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX h_contacts_h_id_idx ON public.h_contacts (h_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.h_contacts TO authenticated;
GRANT ALL ON public.h_contacts TO service_role;
ALTER TABLE public.h_contacts ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 3) staff_profiles
-- =========================================
CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, staff_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'staff_name', split_part(NEW.email, '@', 1)),
    'worker'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- 4) daily_visit_logs
-- =========================================
CREATE TABLE public.daily_visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  h_id UUID NOT NULL REFERENCES public.h_master(id) ON DELETE RESTRICT,
  contact_met_id UUID REFERENCES public.h_contacts(id) ON DELETE SET NULL,
  purpose public.visit_purpose NOT NULL,
  outcome_notes TEXT NOT NULL,
  travel_expense NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (travel_expense >= 0),
  food_expense NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (food_expense >= 0),
  lodge_expense NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (lodge_expense >= 0),
  expense_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX daily_visit_logs_staff_idx ON public.daily_visit_logs (staff_id);
CREATE INDEX daily_visit_logs_h_idx ON public.daily_visit_logs (h_id);
CREATE INDEX daily_visit_logs_date_idx ON public.daily_visit_logs (date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_visit_logs TO authenticated;
GRANT ALL ON public.daily_visit_logs TO service_role;
ALTER TABLE public.daily_visit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS Policies
-- =========================================

-- h_master
CREATE POLICY "hm_select_auth" ON public.h_master
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "hm_insert_auth" ON public.h_master
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hm_update_auth" ON public.h_master
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hm_delete_admin" ON public.h_master
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- h_contacts
CREATE POLICY "hc_select_auth" ON public.h_contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "hc_insert_auth" ON public.h_contacts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hc_update_auth" ON public.h_contacts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hc_delete_admin" ON public.h_contacts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- staff_profiles
CREATE POLICY "sp_select_auth" ON public.staff_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sp_insert_self" ON public.staff_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
-- Users can update their own non-role fields; role changes are admin-only,
-- enforced by a trigger below (RLS UPDATE can't compare NEW vs OLD directly).
CREATE POLICY "sp_update_self_or_admin" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sp_delete_admin" ON public.staff_profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Prevent non-admins from changing their own role
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_profiles_guard_role
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- daily_visit_logs
CREATE POLICY "dvl_select_own_or_admin" ON public.daily_visit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "dvl_insert_own" ON public.daily_visit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "dvl_update_own_or_admin" ON public.daily_visit_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = staff_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "dvl_delete_own_or_admin" ON public.daily_visit_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'admin'));
