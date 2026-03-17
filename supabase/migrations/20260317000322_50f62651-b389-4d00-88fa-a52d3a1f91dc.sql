UPDATE profiles p
SET 
  phone = u.raw_user_meta_data->>'phone',
  cpf = COALESCE(p.cpf, u.raw_user_meta_data->>'cpf')
FROM auth.users u
WHERE p.user_id = u.id
  AND p.phone IS NULL
  AND u.raw_user_meta_data->>'phone' IS NOT NULL;