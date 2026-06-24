
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone_normalized text;

ALTER TABLE public.members ALTER COLUMN qr_code_value DROP NOT NULL;

UPDATE public.members
SET
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name = COALESCE(
    last_name,
    NULLIF(regexp_replace(full_name, '^\S+\s*', ''), '')
  ),
  phone_normalized = COALESCE(
    phone_normalized,
    NULLIF(regexp_replace(COALESCE(contact_number, ''), '\D', '', 'g'), '')
  );

CREATE UNIQUE INDEX IF NOT EXISTS members_phone_normalized_key
  ON public.members(phone_normalized)
  WHERE phone_normalized IS NOT NULL;
