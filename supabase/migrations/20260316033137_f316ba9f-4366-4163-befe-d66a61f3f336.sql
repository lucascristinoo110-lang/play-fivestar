
-- Atomic balance adjustment function to prevent race conditions
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE profiles
  SET balance = GREATEST(0, COALESCE(balance, 0) + p_amount),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  RETURN v_new_balance;
END;
$$;

-- Check balance + debit atomically (fails if insufficient)
CREATE OR REPLACE FUNCTION public.debit_balance(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE profiles
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND COALESCE(balance, 0) >= p_amount
  RETURNING balance INTO v_new_balance;
  
  IF v_new_balance IS NULL THEN
    -- Check if user exists
    PERFORM 1 FROM profiles WHERE user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User not found: %', p_user_id;
    ELSE
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
  END IF;
  
  RETURN v_new_balance;
END;
$$;
