ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (
  type = ANY (
    ARRAY[
      'deposit'::text,
      'withdraw'::text,
      'bet'::text,
      'win'::text,
      'bonus'::text,
      'rollover'::text,
      'game_bet'::text,
      'game_win'::text,
      'game_refund'::text
    ]
  )
);