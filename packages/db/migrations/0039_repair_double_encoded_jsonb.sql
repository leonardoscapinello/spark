-- O banco aceitou JSON dentro de JSON e ninguém percebeu.
--
-- Escritas que passaram uma string já serializada para uma coluna jsonb
-- gravaram `"[\"Pro\"]"` (uma string JSON) onde deveria haver `["Pro"]` (um
-- array). O Postgres aceitou — jsonb guarda qualquer JSON válido, e uma string
-- é JSON válido. A tela quebrou ao ler, e a migração 0038 não achou nada para
-- copiar, porque procurava arrays.
--
-- Isto conserta o que está gravado e refaz a cópia. É a mesma razão de as
-- tabelas relacionais existirem: com coluna tipada, este erro teria sido
-- recusado na escrita.

CREATE OR REPLACE FUNCTION spark_unwrap_jsonb(value jsonb) RETURNS jsonb AS $$
BEGIN
  IF jsonb_typeof(value) <> 'string' THEN RETURN value; END IF;
  RETURN (value #>> '{}')::jsonb;
EXCEPTION WHEN others THEN RETURN value;   -- string que não é JSON fica como está
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE custom_field_definitions SET options = spark_unwrap_jsonb(options) WHERE jsonb_typeof(options) = 'string';
UPDATE contacts SET custom_fields = spark_unwrap_jsonb(custom_fields) WHERE jsonb_typeof(custom_fields) = 'string';
UPDATE contacts SET tags = spark_unwrap_jsonb(tags) WHERE jsonb_typeof(tags) = 'string';
UPDATE companies SET custom_fields = spark_unwrap_jsonb(custom_fields) WHERE jsonb_typeof(custom_fields) = 'string';
UPDATE companies SET tags = spark_unwrap_jsonb(tags) WHERE jsonb_typeof(tags) = 'string';
UPDATE deals SET custom_fields = spark_unwrap_jsonb(custom_fields) WHERE jsonb_typeof(custom_fields) = 'string';
UPDATE products SET tags = spark_unwrap_jsonb(tags) WHERE jsonb_typeof(tags) = 'string';
UPDATE permission_groups SET capabilities = spark_unwrap_jsonb(capabilities) WHERE jsonb_typeof(capabilities) = 'string';

-- Enquanto a coluna existir, o banco passa a recusar o erro em vez de aceitá-lo.
ALTER TABLE custom_field_definitions ADD CONSTRAINT custom_field_definitions_options_is_array CHECK (jsonb_typeof(options) = 'array');
ALTER TABLE contacts ADD CONSTRAINT contacts_custom_fields_is_object CHECK (jsonb_typeof(custom_fields) = 'object');
ALTER TABLE contacts ADD CONSTRAINT contacts_tags_is_array CHECK (jsonb_typeof(tags) = 'array');
ALTER TABLE companies ADD CONSTRAINT companies_custom_fields_is_object CHECK (jsonb_typeof(custom_fields) = 'object');
ALTER TABLE companies ADD CONSTRAINT companies_tags_is_array CHECK (jsonb_typeof(tags) = 'array');
ALTER TABLE deals ADD CONSTRAINT deals_custom_fields_is_object CHECK (jsonb_typeof(custom_fields) = 'object');

-- Refaz a cópia da 0038 agora que os valores são arrays e objetos de verdade.
INSERT INTO custom_field_options (id, org_id, field_id, value, label, sort_order)
SELECT gen_random_uuid(), d.org_id, d.id, option_value, option_value, (ordinality - 1)::integer
FROM custom_field_definitions d
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(d.options) = 'array' THEN d.options ELSE '[]'::jsonb END) WITH ORDINALITY AS t(option_value, ordinality)
ON CONFLICT (field_id, value) DO NOTHING;

CREATE OR REPLACE FUNCTION spark_backfill_custom_values(source_table text, source_entity text) RETURNS void AS $$
BEGIN
  EXECUTE format($sql$
    INSERT INTO custom_field_values (id, org_id, field_id, entity_type, entity_id, value_text, value_number, value_money, value_date, value_timestamp, value_boolean, option_id)
    SELECT gen_random_uuid(), r.org_id, d.id, %L, r.id,
      CASE WHEN d.type IN ('text','paragraph','phone','url') THEN entry.value#>>'{}' END,
      CASE WHEN d.type = 'number' THEN (entry.value#>>'{}')::numeric END,
      CASE WHEN d.type = 'currency' THEN (entry.value#>>'{}')::bigint END,
      CASE WHEN d.type = 'date' THEN (entry.value#>>'{}')::date END,
      CASE WHEN d.type = 'datetime' THEN (entry.value#>>'{}')::timestamptz END,
      CASE WHEN d.type = 'boolean' THEN (entry.value#>>'{}')::boolean END,
      CASE WHEN d.type = 'single_select' THEN (SELECT o.id FROM custom_field_options o WHERE o.field_id = d.id AND o.value = entry.value#>>'{}') END
    FROM %I r
    JOIN custom_field_definitions d ON d.org_id = r.org_id AND d.entity_type = %L
    CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.custom_fields) = 'object' THEN r.custom_fields ELSE '{}'::jsonb END) AS entry(key, value)
    WHERE entry.key = d.key
      AND d.type <> 'multi_select'
      AND entry.value IS NOT NULL AND entry.value <> 'null'::jsonb AND entry.value#>>'{}' <> ''
    ON CONFLICT DO NOTHING
  $sql$, source_entity, source_table, source_entity);

  EXECUTE format($sql$
    INSERT INTO custom_field_values (id, org_id, field_id, entity_type, entity_id, option_id)
    SELECT gen_random_uuid(), r.org_id, d.id, %L, r.id, o.id
    FROM %I r
    JOIN custom_field_definitions d ON d.org_id = r.org_id AND d.entity_type = %L
    CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.custom_fields) = 'object' THEN r.custom_fields ELSE '{}'::jsonb END) AS entry(key, value)
    CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(entry.value) = 'array' THEN entry.value ELSE '[]'::jsonb END) AS chosen(option_value)
    JOIN custom_field_options o ON o.field_id = d.id AND o.value = chosen.option_value
    WHERE entry.key = d.key AND d.type = 'multi_select'
    ON CONFLICT DO NOTHING
  $sql$, source_entity, source_table, source_entity);
END;
$$ LANGUAGE plpgsql;

SELECT spark_backfill_custom_values('contacts', 'contact');
SELECT spark_backfill_custom_values('companies', 'company');
SELECT spark_backfill_custom_values('deals', 'deal');
DROP FUNCTION spark_backfill_custom_values(text, text);
DROP FUNCTION spark_unwrap_jsonb(jsonb);
