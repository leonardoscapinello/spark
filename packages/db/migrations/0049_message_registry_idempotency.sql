-- O registro global também é a barreira de concorrência. Dois webhooks com o
-- mesmo external_id serializam pela mesma advisory lock; o segundo insert é
-- cancelado como replay, sem transformar idempotência em erro 500.
CREATE OR REPLACE FUNCTION register_message_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 0));
    IF EXISTS (SELECT 1 FROM message_registry WHERE id = NEW.id) THEN RETURN NULL; END IF;

    IF NEW.external_id IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.org_id::text || ':' || NEW.external_id, 0));
      IF EXISTS (SELECT 1 FROM message_registry WHERE org_id = NEW.org_id AND external_id = NEW.external_id) THEN RETURN NULL; END IF;
    END IF;

    INSERT INTO message_registry (id, org_id, external_id, created_at)
    VALUES (NEW.id, NEW.org_id, NEW.external_id, NEW.created_at);
  ELSE
    UPDATE message_registry SET
      org_id = NEW.org_id,
      external_id = COALESCE(NEW.external_id, message_registry.external_id),
      created_at = NEW.created_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
