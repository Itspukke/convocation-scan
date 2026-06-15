-- Allow public inserts/deletes on members (admin gated client-side)
CREATE POLICY "Anyone can insert members" ON public.members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete members" ON public.members FOR DELETE TO public USING (true);
CREATE POLICY "Anyone can update members" ON public.members FOR UPDATE TO public USING (true) WITH CHECK (true);
GRANT INSERT, UPDATE, DELETE ON public.members TO anon, authenticated;