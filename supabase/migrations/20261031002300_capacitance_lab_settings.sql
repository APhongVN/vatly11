CREATE TABLE IF NOT EXISTS public.capacitance_lab_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_voltage NUMERIC(6,2) NOT NULL DEFAULT 12 CHECK (max_voltage BETWEEN 1 AND 60),
  plate_area_min_cm2 NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK (plate_area_min_cm2 BETWEEN 1 AND 10000),
  plate_area_max_cm2 NUMERIC(8,2) NOT NULL DEFAULT 600 CHECK (plate_area_max_cm2 BETWEEN 1 AND 10000),
  plate_distance_min_mm NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (plate_distance_min_mm BETWEEN 0.1 AND 1000),
  plate_distance_max_mm NUMERIC(8,2) NOT NULL DEFAULT 10 CHECK (plate_distance_max_mm BETWEEN 0.1 AND 1000),
  dielectric_min NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (dielectric_min BETWEEN 1 AND 1000),
  dielectric_max NUMERIC(8,2) NOT NULL DEFAULT 10 CHECK (dielectric_max BETWEEN 1 AND 1000),
  dielectric_default NUMERIC(8,2) NOT NULL DEFAULT 2 CHECK (dielectric_default BETWEEN 1 AND 1000),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (plate_area_max_cm2 > plate_area_min_cm2),
  CHECK (plate_distance_max_mm > plate_distance_min_mm),
  CHECK (dielectric_max > dielectric_min),
  CHECK (dielectric_default BETWEEN dielectric_min AND dielectric_max)
);

INSERT INTO public.capacitance_lab_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.capacitance_lab_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.capacitance_lab_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.capacitance_lab_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.capacitance_lab_settings TO service_role;

DROP POLICY IF EXISTS capacitance_lab_settings_read_authenticated ON public.capacitance_lab_settings;
CREATE POLICY capacitance_lab_settings_read_authenticated
  ON public.capacitance_lab_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS capacitance_lab_settings_teacher_insert ON public.capacitance_lab_settings;
CREATE POLICY capacitance_lab_settings_teacher_insert
  ON public.capacitance_lab_settings FOR INSERT TO authenticated WITH CHECK (public.is_teacher());
DROP POLICY IF EXISTS capacitance_lab_settings_teacher_update ON public.capacitance_lab_settings;
CREATE POLICY capacitance_lab_settings_teacher_update
  ON public.capacitance_lab_settings FOR UPDATE TO authenticated
  USING (public.is_teacher()) WITH CHECK (public.is_teacher());
