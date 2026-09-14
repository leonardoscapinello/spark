-- Busca full-text de pessoas (roadmap Fase 1). Coluna gerada + índice GIN:
-- o Postgres mantém o vetor sozinho a cada write, sem trigger e sem código
-- de aplicação. Dicionário 'simple' (sem stemming de idioma — nome próprio
-- e e-mail não têm morfologia) sobre texto sem acento, porque ninguém
-- digita "Jose" esperando não achar "José".
--
-- unaccent() é STABLE e coluna gerada exige IMMUTABLE; o wrapper abaixo é o
-- padrão para isso, com o dicionário qualificado para a promessa valer.
-- Tudo idempotente: reaplicar não muda nada.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', immutable_unaccent(
      coalesce(name, '')
      -- e-mail inteiro é UM lexema para o parser ('jose@vega.com'); quebrado
      -- em partes, "vega" acha o contato — que é o que quem busca espera.
      || ' ' || regexp_replace(coalesce(email, ''), '[^[:alnum:]]+', ' ', 'g')
      || ' ' || coalesce(phone, '')
    ))
  ) STORED;

CREATE INDEX IF NOT EXISTS contacts_search_vector_gin ON contacts USING gin (search_vector);
