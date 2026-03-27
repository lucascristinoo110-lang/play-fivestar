
DROP POLICY IF EXISTS "Users upload own kyc docs" ON storage.objects;

CREATE POLICY "Users upload any kyc doc"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');
