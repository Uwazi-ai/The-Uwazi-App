
-- ============ redemption_codes ============
CREATE TABLE IF NOT EXISTS public.redemption_codes (
  code             text PRIMARY KEY,
  label            text NOT NULL,
  grant_days       integer,
  grant_until      timestamptz,
  max_redemptions  integer,
  redeemed_count   integer     NOT NULL DEFAULT 0,
  starts_at        timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT code_is_upper CHECK (code = upper(code)),
  CONSTRAINT one_grant_mode CHECK (
    (grant_days IS NOT NULL AND grant_until IS NULL)
    OR (grant_days IS NULL AND grant_until IS NOT NULL)
  )
);

GRANT SELECT ON public.redemption_codes TO authenticated;
GRANT ALL ON public.redemption_codes TO service_role;

ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;

-- No direct writes; reads go through the function too, but allow admins to view.
CREATE POLICY "Admins can view redemption codes"
  ON public.redemption_codes FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ code_redemptions ============
CREATE TABLE IF NOT EXISTS public.code_redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL REFERENCES public.redemption_codes(code),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at  timestamptz NOT NULL DEFAULT now(),
  access_until timestamptz NOT NULL,
  UNIQUE (code, user_id)
);

CREATE INDEX IF NOT EXISTS code_redemptions_user_idx
  ON public.code_redemptions(user_id);

GRANT SELECT ON public.code_redemptions TO authenticated;
GRANT ALL ON public.code_redemptions TO service_role;

ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own redemptions readable"
  ON public.code_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
  ON public.code_redemptions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ redeem function ============
CREATE OR REPLACE FUNCTION public.redeem_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_code  public.redemption_codes%ROWTYPE;
  v_until timestamptz;
  v_env   text := 'live';
  v_sub_id text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in',
      'message', 'Create your free account first, then enter the code.');
  END IF;

  SELECT * INTO v_code
    FROM public.redemption_codes
   WHERE code = upper(trim(p_code))
   FOR UPDATE;

  IF NOT FOUND OR NOT v_code.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid',
      'message', 'That code is not valid. Check the spelling and try again.');
  END IF;

  IF now() < v_code.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_started',
      'message', 'This code is not active yet.');
  END IF;

  IF v_code.expires_at IS NOT NULL AND now() > v_code.expires_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired',
      'message', 'This code has expired.');
  END IF;

  IF v_code.max_redemptions IS NOT NULL
     AND v_code.redeemed_count >= v_code.max_redemptions THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exhausted',
      'message', 'This code has reached its limit.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.code_redemptions
              WHERE code = v_code.code AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed',
      'message', 'You have already redeemed this code.');
  END IF;

  v_until := COALESCE(
    v_code.grant_until,
    now() + make_interval(days => v_code.grant_days)
  );

  INSERT INTO public.code_redemptions (code, user_id, access_until)
  VALUES (v_code.code, v_user, v_until);

  UPDATE public.redemption_codes
     SET redeemed_count = redeemed_count + 1
   WHERE code = v_code.code;

  -- Entitlement write: use the subscriptions table (same pattern as grant-premium).
  -- Never shorten existing access.
  v_sub_id := 'code_' || v_code.code || '_' || v_user::text;

  INSERT INTO public.subscriptions (
    user_id, stripe_subscription_id, stripe_customer_id,
    product_id, price_id, status,
    current_period_start, current_period_end,
    cancel_at_period_end, environment
  ) VALUES (
    v_user, v_sub_id, v_sub_id,
    'code_' || v_code.code, 'code_' || v_code.code, 'active',
    now(), v_until, false, v_env
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE
    SET status = 'active',
        current_period_end = GREATEST(
          COALESCE(public.subscriptions.current_period_end, now()),
          EXCLUDED.current_period_end
        ),
        cancel_at_period_end = false,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code.code,
    'access_until', v_until,
    'message', 'You are in. Enjoy UWAZI+.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_code(text) TO authenticated;

-- ============ seed BACKPACK code ============
INSERT INTO public.redemption_codes (code, label, grant_until, expires_at)
VALUES ('BACKPACK', 'Operation Backpack 2026',
        '2026-12-04 05:59:59+00',
        '2026-09-01 04:59:59+00')
ON CONFLICT (code) DO NOTHING;
