
-- Public read-only data model. No auth.
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  auxiliary_group TEXT NOT NULL,
  contact_number TEXT,
  photo_url TEXT,
  qr_code_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.event_day AS ENUM ('Friday', 'Saturday', 'Sunday');

CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_day public.event_day NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, event_day)
);

CREATE INDEX attendance_member_day_idx ON public.attendance (member_id, event_day);

GRANT SELECT ON public.members TO anon, authenticated;
GRANT ALL ON public.members TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.attendance TO anon, authenticated;
GRANT ALL ON public.attendance TO service_role;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- App is open (no auth). Allow anon read of members and full anon access to attendance.
CREATE POLICY "Anyone can read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Anyone can read attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attendance" ON public.attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update attendance" ON public.attendance FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
