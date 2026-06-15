CREATE POLICY "member-photos read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'member-photos');
CREATE POLICY "member-photos insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'member-photos');
CREATE POLICY "member-photos delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'member-photos');