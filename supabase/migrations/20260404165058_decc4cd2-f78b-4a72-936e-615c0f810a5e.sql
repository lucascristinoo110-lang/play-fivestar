
CREATE OR REPLACE FUNCTION public.validate_withdraw_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_min_withdraw numeric;
  v_require_kyc boolean;
  v_kyc_count integer;
BEGIN
  -- Only validate withdrawal inserts
  IF NEW.type <> 'withdraw' THEN
    RETURN NEW;
  END IF;

  -- Get site settings
  SELECT min_withdraw, require_kyc_for_withdraw
  INTO v_min_withdraw, v_require_kyc
  FROM site_settings
  LIMIT 1;

  v_min_withdraw := COALESCE(v_min_withdraw, 50);
  v_require_kyc := COALESCE(v_require_kyc, true);

  -- Check minimum amount
  IF NEW.amount < v_min_withdraw THEN
    RAISE EXCEPTION 'Valor mínimo para saque é R$ %. Você tentou R$ %.', v_min_withdraw, NEW.amount;
  END IF;

  -- Check KYC
  IF v_require_kyc THEN
    SELECT COUNT(*) INTO v_kyc_count
    FROM kyc_documents
    WHERE user_id = NEW.user_id AND status = 'approved';

    IF v_kyc_count = 0 THEN
      RAISE EXCEPTION 'Verificação KYC necessária. Envie seus documentos e aguarde aprovação.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_withdraw
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_withdraw_request();
