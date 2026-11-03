-- Allow a user to retain a primary role and hold additional roles.
ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "additionalRoles" public."Role"[] NOT NULL DEFAULT ARRAY[]::public."Role"[];

-- Ensure the existing Supabase Auth account has an application user row with both roles.
DO $$
DECLARE
  matching_users integer;
BEGIN
  SELECT count(*) INTO matching_users
  FROM public."User"
  WHERE lower(email) = lower('vparco@princeretail.com');

  IF matching_users > 1 THEN
    RAISE EXCEPTION 'Multiple application users match vparco@princeretail.com; resolve duplicates before assigning roles.';
  ELSIF matching_users = 1 THEN
    UPDATE public."User"
    SET
      role = 'ADMINISTRATOR',
      "additionalRoles" = ARRAY['REQUESTOR']::public."Role"[]
    WHERE lower(email) = lower('vparco@princeretail.com');
  ELSE
    INSERT INTO public."User" (id, email, role, "additionalRoles", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      'vparco@princeretail.com',
      'ADMINISTRATOR',
      ARRAY['REQUESTOR']::public."Role"[],
      now(),
      now()
    );
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
