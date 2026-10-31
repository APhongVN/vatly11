-- Store individual peer instruction votes behind a server-only aggregate endpoint.
CREATE TABLE IF NOT EXISTS public.peer_instruction_votes (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL CHECK (question_id IN ('PI1', 'PI2', 'PI3')),
  first_choice SMALLINT CHECK (first_choice BETWEEN 0 AND 2),
  first_voted_at TIMESTAMPTZ,
  second_choice SMALLINT CHECK (second_choice BETWEEN 0 AND 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, question_id),
  CHECK (first_choice IS NOT NULL OR second_choice IS NULL),
  CHECK ((first_choice IS NULL AND first_voted_at IS NULL) OR (first_choice IS NOT NULL AND first_voted_at IS NOT NULL))
);

ALTER TABLE public.peer_instruction_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.peer_instruction_votes FROM anon, authenticated;
GRANT ALL ON public.peer_instruction_votes TO service_role;
