ALTER TABLE public.ballot_contests DROP CONSTRAINT IF EXISTS ballot_contests_verification_status_chk;
ALTER TABLE public.ballot_contests ADD CONSTRAINT ballot_contests_verification_status_chk
  CHECK (verification_status IN ('verified','unverified','needs_review','flagged'));