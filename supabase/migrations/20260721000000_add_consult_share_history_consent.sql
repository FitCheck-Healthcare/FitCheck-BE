-- share_history_consent: member agrees to share diet/workout history with trainer
ALTER TABLE public.consult_requests
  ADD COLUMN IF NOT EXISTS share_history_consent boolean NOT NULL DEFAULT false;
