
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, staff_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'staff_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'admin@lifecare.local' THEN 'admin'::app_role ELSE 'worker'::app_role END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
