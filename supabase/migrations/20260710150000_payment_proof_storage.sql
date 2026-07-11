-- Payment proof screenshots: storage bucket + contribution metadata

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS payment_proof_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Payer uploads proof for their pending/awaiting contribution
CREATE POLICY payment_proof_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.contributions c
    INNER JOIN public.members m ON m.id = c.from_member_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND m.auth_user_id = auth.uid()
      AND c.status IN ('pending', 'awaiting_confirmation')
  )
);

-- Payer replaces an existing proof before confirmation
CREATE POLICY payment_proof_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.contributions c
    INNER JOIN public.members m ON m.id = c.from_member_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND m.auth_user_id = auth.uid()
      AND c.status IN ('pending', 'awaiting_confirmation')
  )
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.contributions c
    INNER JOIN public.members m ON m.id = c.from_member_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND m.auth_user_id = auth.uid()
      AND c.status IN ('pending', 'awaiting_confirmation')
  )
);

-- Payer or admin deletes proof; payer only while still pending confirmation
CREATE POLICY payment_proof_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      INNER JOIN public.members m ON m.id = c.from_member_id
      WHERE c.id::text = (storage.foldername(name))[1]
        AND m.auth_user_id = auth.uid()
        AND c.status IN ('pending', 'awaiting_confirmation')
    )
    OR EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.auth_user_id = auth.uid() AND m.role = 'admin'
    )
  )
);

-- Payer, recipient, or admin can view proof
CREATE POLICY payment_proof_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      INNER JOIN public.members m ON m.id = c.from_member_id
      WHERE c.id::text = (storage.foldername(name))[1]
        AND m.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.contributions c
      INNER JOIN public.members m ON m.id = c.to_member_id
      WHERE c.id::text = (storage.foldername(name))[1]
        AND m.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.auth_user_id = auth.uid() AND m.role = 'admin'
    )
  )
);
