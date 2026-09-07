-- PII field encryption: topic stored as ciphertext (drop enum check)
ALTER TABLE public.consult_requests
  DROP CONSTRAINT IF EXISTS consult_requests_topic_check;

-- Phone lookup hash (HMAC-SHA256 hex, normalized digits)
ALTER TABLE public.consult_requests
  ADD COLUMN IF NOT EXISTS phone_hmac text;

CREATE INDEX IF NOT EXISTS consult_requests_phone_hmac_idx
  ON public.consult_requests (phone_hmac);
