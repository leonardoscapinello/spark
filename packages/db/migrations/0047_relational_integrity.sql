-- Integridade relacional é responsabilidade do Postgres, inclusive quando uma
-- escrita não passa pela API. Esta migration fecha três classes de lacuna:
-- tenant cruzado em FKs simples, relações compostas de domínio e invariantes
-- escalares que já existem nos schemas de packages/core.

-- Tabelas normalizadas por 0045/0046 também precisam participar da publicação.
ALTER PUBLICATION electric_publication_default ADD TABLE audience_lead_statuses, audience_tags, user_preference_items;

-- Toda FK de uma tabela com org_id para outra tabela com org_id precisa apontar
-- para uma linha da mesma organização. O FK simples continua cuidando da
-- existência; estes guards cuidam da fronteira do tenant sem duplicar org_id
-- em dezenas de chaves primárias públicas.
CREATE OR REPLACE FUNCTION enforce_same_org_fk() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  local_value text := to_jsonb(NEW) ->> TG_ARGV[2];
  parent_exists boolean;
BEGIN
  IF local_value IS NULL THEN RETURN NEW; END IF;
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = $1::uuid AND org_id = $2::uuid)',
    TG_ARGV[0], TG_ARGV[1]
  ) INTO parent_exists USING local_value, NEW.org_id::text;
  IF NOT parent_exists THEN
    RAISE EXCEPTION 'cross-organization reference from %.% to %.%', TG_TABLE_NAME, TG_ARGV[2], TG_ARGV[0], TG_ARGV[1]
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE relation record; trigger_name text;
BEGIN
  FOR relation IN
    SELECT c.conrelid::regclass::text AS child_table,
           c.confrelid::regclass::text AS parent_table,
           child_col.attname AS child_column,
           parent_col.attname AS parent_column,
           c.oid
    FROM pg_constraint c
    JOIN pg_attribute child_col ON child_col.attrelid = c.conrelid AND child_col.attnum = c.conkey[1]
    JOIN pg_attribute parent_col ON parent_col.attrelid = c.confrelid AND parent_col.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND cardinality(c.conkey) = 1
      AND c.connamespace = 'public'::regnamespace
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attname = 'org_id' AND NOT a.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.confrelid AND a.attname = 'org_id' AND NOT a.attisdropped)
  LOOP
    trigger_name := 'tenant_fk_guard_' || md5(relation.oid::text);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF org_id, %I ON %s FOR EACH ROW EXECUTE FUNCTION enforce_same_org_fk(%L, %L, %L)',
      trigger_name, relation.child_column, relation.child_table,
      relation.parent_table, relation.parent_column, relation.child_column
    );
  END LOOP;
END $$;

-- O pai precisa ter, além do id, o atributo que a linha filha declarou.
CREATE OR REPLACE FUNCTION enforce_parent_attribute() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  foreign_value text := to_jsonb(NEW) ->> TG_ARGV[1];
  local_value text := to_jsonb(NEW) ->> TG_ARGV[3];
  matches boolean;
BEGIN
  IF foreign_value IS NULL THEN RETURN NEW; END IF;
  IF local_value IS NULL THEN
    RAISE EXCEPTION '%.% is required when %.% is set', TG_TABLE_NAME, TG_ARGV[3], TG_TABLE_NAME, TG_ARGV[1]
      USING ERRCODE = '23514';
  END IF;
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1::uuid AND org_id = $2::uuid AND %I::text = $3)',
    TG_ARGV[0], TG_ARGV[2]
  ) INTO matches USING foreign_value, NEW.org_id::text, local_value;
  IF NOT matches THEN
    RAISE EXCEPTION 'inconsistent relation on %.%', TG_TABLE_NAME, TG_ARGV[1] USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER deals_stage_pipeline_guard BEFORE INSERT OR UPDATE OF org_id, stage_id, pipeline_id ON deals
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('stages', 'stage_id', 'pipeline_id', 'pipeline_id');
CREATE TRIGGER stage_field_rules_stage_pipeline_guard BEFORE INSERT OR UPDATE OF org_id, stage_id, pipeline_id ON stage_field_rules
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('stages', 'stage_id', 'pipeline_id', 'pipeline_id');
CREATE TRIGGER automation_runs_version_guard BEFORE INSERT OR UPDATE OF org_id, version_id, automation_id ON automation_runs
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('automation_versions', 'version_id', 'automation_id', 'automation_id');
CREATE TRIGGER social_posts_channel_guard BEFORE INSERT OR UPDATE OF org_id, channel_id, connection_id ON social_posts
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('social_channels', 'channel_id', 'connection_id', 'connection_id');
CREATE TRIGGER messages_conversation_contact_guard BEFORE INSERT OR UPDATE OF org_id, conversation_id, contact_id ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('conversations', 'conversation_id', 'contact_id', 'contact_id');
CREATE TRIGGER deal_products_variant_guard BEFORE INSERT OR UPDATE OF org_id, variant_id, product_id ON deal_products
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('product_variants', 'variant_id', 'product_id', 'product_id');
CREATE TRIGGER custom_field_values_option_guard BEFORE INSERT OR UPDATE OF org_id, option_id, field_id ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('custom_field_options', 'option_id', 'field_id', 'field_id');
CREATE TRIGGER custom_field_values_definition_guard BEFORE INSERT OR UPDATE OF org_id, field_id, entity_type ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('custom_field_definitions', 'field_id', 'entity_type', 'entity_type');
CREATE TRIGGER preference_items_owner_guard BEFORE INSERT OR UPDATE OF org_id, preference_id, user_id ON user_preference_items
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('user_preferences', 'preference_id', 'user_id', 'user_id');
CREATE TRIGGER automations_published_version_guard BEFORE INSERT OR UPDATE OF org_id, current_published_version_id, id ON automations
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('automation_versions', 'current_published_version_id', 'automation_id', 'id');
CREATE TRIGGER pages_published_version_guard BEFORE INSERT OR UPDATE OF org_id, published_version_id, id ON pages
  FOR EACH ROW EXECUTE FUNCTION enforce_parent_attribute('page_versions', 'published_version_id', 'page_id', 'id');

-- Campo e submissão precisam pertencer ao mesmo formulário.
CREATE OR REPLACE FUNCTION enforce_submission_field() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM form_submissions s
    JOIN lead_form_fields f ON f.form_id = s.form_id AND f.org_id = s.org_id
    WHERE s.id = NEW.submission_id AND f.id = NEW.field_id AND s.org_id = NEW.org_id
  ) THEN RAISE EXCEPTION 'submission field belongs to another form' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER form_submission_values_field_guard BEFORE INSERT OR UPDATE OF org_id, submission_id, field_id ON form_submission_values
  FOR EACH ROW EXECUTE FUNCTION enforce_submission_field();

-- O alvo polimórfico de um campo personalizado é fechado e validado, em vez
-- de aceitar UUID órfão. Separar três tabelas repetiria a mesma estrutura e
-- tornaria a definição do campo mais difícil de consultar.
CREATE OR REPLACE FUNCTION enforce_custom_field_entity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE target_table text; target_exists boolean;
BEGIN
  target_table := CASE NEW.entity_type WHEN 'contact' THEN 'contacts' WHEN 'company' THEN 'companies' WHEN 'deal' THEN 'deals' END;
  IF target_table IS NULL THEN RAISE EXCEPTION 'unsupported custom field entity type: %', NEW.entity_type USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1 AND org_id = $2)', target_table)
    INTO target_exists USING NEW.entity_id, NEW.org_id;
  IF NOT target_exists THEN RAISE EXCEPTION 'custom field target does not exist in this organization' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER custom_field_values_entity_guard BEFORE INSERT OR UPDATE OF org_id, entity_type, entity_id ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION enforce_custom_field_entity();

-- Notas sempre têm alvo real.
ALTER TABLE notes ADD CONSTRAINT notes_deal_fk FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT notes_contact_fk FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT notes_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT notes_has_target_check CHECK (num_nonnulls(deal_id, contact_id, company_id) >= 1);

-- Um valor escalar tem uma única linha; NULL em option_id não pode driblar a
-- unicidade SQL. Tipos consultáveis recebem seus próprios índices.
CREATE UNIQUE INDEX custom_field_values_scalar_uidx ON custom_field_values (field_id, entity_id) WHERE option_id IS NULL;
CREATE INDEX custom_field_values_money_idx ON custom_field_values (org_id, field_id, value_money) WHERE value_money IS NOT NULL;
CREATE INDEX custom_field_values_date_idx ON custom_field_values (org_id, field_id, value_date) WHERE value_date IS NOT NULL;
CREATE INDEX custom_field_values_timestamp_idx ON custom_field_values (org_id, field_id, value_timestamp) WHERE value_timestamp IS NOT NULL;
CREATE INDEX custom_field_values_boolean_idx ON custom_field_values (org_id, field_id, value_boolean) WHERE value_boolean IS NOT NULL;

CREATE UNIQUE INDEX user_preference_items_object_key_uidx ON user_preference_items (preference_id, item_key) WHERE item_key IS NOT NULL;
CREATE UNIQUE INDEX user_preference_items_list_order_uidx ON user_preference_items (preference_id, sort_order) WHERE item_key IS NULL;

ALTER TABLE contacts ADD CONSTRAINT contacts_score_check CHECK (score BETWEEN 0 AND 100);
ALTER TABLE audiences ADD CONSTRAINT audiences_minimum_score_check CHECK (minimum_score IS NULL OR minimum_score BETWEEN 0 AND 100);
ALTER TABLE stages ADD CONSTRAINT stages_sort_order_check CHECK (sort_order >= 0);
ALTER TABLE stages ADD CONSTRAINT stages_probability_check CHECK (probability BETWEEN 0 AND 100);
ALTER TABLE deals ADD CONSTRAINT deals_amount_check CHECK (amount >= 0);
ALTER TABLE deals ADD CONSTRAINT deals_status_check CHECK (status = ANY (ARRAY['open', 'won', 'lost']));
ALTER TABLE activities ADD CONSTRAINT activities_target_check CHECK (num_nonnulls(contact_id, deal_id) >= 1);
ALTER TABLE activities ADD CONSTRAINT activities_type_check CHECK (type = ANY (ARRAY['task', 'call', 'meeting', 'email', 'lunch', 'deadline']));
ALTER TABLE activities ADD CONSTRAINT activities_duration_check CHECK (duration_minutes BETWEEN 0 AND 1440);
ALTER TABLE activities ADD CONSTRAINT activities_completion_check CHECK (completed = (completed_at IS NOT NULL));
ALTER TABLE deal_products ADD CONSTRAINT deal_products_quantity_check CHECK (quantity_milli > 0);
ALTER TABLE deal_products ADD CONSTRAINT deal_products_amount_check CHECK (unit_amount >= 0);
ALTER TABLE deal_products ADD CONSTRAINT deal_products_discount_check CHECK (discount_basis_points BETWEEN 0 AND 10000);
ALTER TABLE deal_products ADD CONSTRAINT deal_products_tax_check CHECK (tax_basis_points BETWEEN 0 AND 10000);
ALTER TABLE deal_products ADD CONSTRAINT deal_products_sort_order_check CHECK (sort_order >= 0);
ALTER TABLE stage_field_rules ADD CONSTRAINT stage_field_rules_level_check CHECK (level = ANY (ARRAY['required', 'important']));
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_typed_value_check CHECK (
  (value_kind = 'text' AND value_text IS NOT NULL AND value_number IS NULL AND value_boolean IS NULL) OR
  (value_kind = 'number' AND value_text IS NULL AND value_number IS NOT NULL AND value_boolean IS NULL) OR
  (value_kind = 'boolean' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NOT NULL) OR
  (value_kind IN ('list', 'object') AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NULL)
);

CREATE INDEX contacts_org_email_idx ON contacts (org_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX contacts_org_phone_idx ON contacts (org_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Metadado interno de migration não é superfície da aplicação.
REVOKE ALL ON TABLE _spark_migrations FROM app_user;
