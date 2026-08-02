CREATE TABLE public.community_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Unattributed',
  region text NOT NULL DEFAULT 'Global',
  discipline text NOT NULL DEFAULT 'Philosophy',
  group_name text NOT NULL DEFAULT 'Unattributed',
  aliases text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  signature text NOT NULL DEFAULT '',
  era_start integer,
  era_end integer,
  gender text NOT NULL DEFAULT 'unknown',
  voice text NOT NULL DEFAULT 'alloy',
  system_prompt text NOT NULL,
  consultations integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.community_personas TO anon;
GRANT SELECT, INSERT ON public.community_personas TO authenticated;
GRANT ALL ON public.community_personas TO service_role;

ALTER TABLE public.community_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community personas are readable by everyone"
  ON public.community_personas FOR SELECT
  USING (true);

CREATE POLICY "Anyone may publish a persona"
  ON public.community_personas FOR INSERT
  WITH CHECK (true);

CREATE INDEX community_personas_created_at_idx ON public.community_personas (created_at DESC);

CREATE OR REPLACE FUNCTION public.increment_persona_consultations(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_personas
  SET consultations = consultations + 1
  WHERE slug = _slug;
$$;

GRANT EXECUTE ON FUNCTION public.increment_persona_consultations(text) TO anon, authenticated;