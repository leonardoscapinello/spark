-- Campos personalizados deixam de morar em JSON e passam a ser linhas.
--
-- Antes: `custom_field_definitions.options` era um array jsonb e o valor de
-- cada registro ficava dentro de `contacts.custom_fields` / `companies.*` /
-- `deals.*`. Isso impedia tudo o que um banco existe para fazer: filtrar por
-- um campo, indexar, agrupar em relatório, ligar um BI. Também não havia
-- validação nenhuma — o banco aceitava qualquer coisa lá dentro.
--
-- Agora: uma tabela para as opções e uma para os valores, com **uma coluna por
-- tipo de dado**, para que um número seja número e uma data seja data. Uma
-- linha por valor; um campo de seleção múltipla tem uma linha por opção
-- escolhida.
--
-- Expand/contract: as colunas jsonb continuam aqui e são copiadas para as
-- tabelas novas. A migração que as remove vem depois, quando todo o código
-- estiver lendo das tabelas.

CREATE TABLE custom_field_options (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  field_id uuid NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_field_options_unique UNIQUE (field_id, value)
);
CREATE INDEX custom_field_options_field_idx ON custom_field_options (org_id, field_id, sort_order);

CREATE TABLE custom_field_values (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  field_id uuid NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  -- Qual registro: 'contact' | 'company' | 'deal' | 'conversation' | 'activity'.
  -- Sem chave estrangeira porque o alvo varia; a limpeza é por gatilho de
  -- exclusão lógica, que é como o sistema inteiro apaga (ADR-0012).
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,

  -- Uma coluna por tipo: é isso que devolve SELECT, índice e relatório.
  value_text text,
  value_number numeric(20, 6),
  value_money bigint,            -- centavos inteiros, como todo dinheiro aqui
  value_date date,
  value_timestamp timestamptz,
  value_boolean boolean,
  option_id uuid REFERENCES custom_field_options(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custom_field_values_entity_type_check
    CHECK (entity_type = ANY (ARRAY['contact','company','deal','conversation','activity'])),
  -- Exatamente uma coluna de valor preenchida: um valor não pode ser texto e
  -- número ao mesmo tempo, e uma linha sem valor nenhum não é um valor.
  CONSTRAINT custom_field_values_one_value_check CHECK (
    (CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_number IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_money IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_date IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_timestamp IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN option_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),
  -- Um valor por campo em cada registro; seleção múltipla repete o campo com
  -- opções diferentes, e é por isso que a opção entra na chave.
  CONSTRAINT custom_field_values_unique UNIQUE (field_id, entity_id, option_id)
);
CREATE INDEX custom_field_values_entity_idx ON custom_field_values (org_id, entity_type, entity_id);
CREATE INDEX custom_field_values_field_idx ON custom_field_values (org_id, field_id);
-- Índices para a pergunta que o relatório faz: "quem tem este valor neste campo?"
CREATE INDEX custom_field_values_text_idx ON custom_field_values (org_id, field_id, value_text) WHERE value_text IS NOT NULL;
CREATE INDEX custom_field_values_number_idx ON custom_field_values (org_id, field_id, value_number) WHERE value_number IS NOT NULL;
CREATE INDEX custom_field_values_option_idx ON custom_field_values (org_id, field_id, option_id) WHERE option_id IS NOT NULL;

ALTER TABLE custom_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_field_options_isolation_by_org ON custom_field_options FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY custom_field_values_isolation_by_org ON custom_field_values FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_options TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_values TO app_user;

-- Copia as opções que estavam no array jsonb, preservando a ordem.
INSERT INTO custom_field_options (id, org_id, field_id, value, label, sort_order)
SELECT gen_random_uuid(), d.org_id, d.id, option_value, option_value, (ordinality - 1)::integer
FROM custom_field_definitions d
-- A expansão precisa ser protegida aqui dentro: LATERAL roda antes do WHERE,
-- então um valor que não seja lista derrubaria a migração inteira.
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(d.options) = 'array' THEN d.options ELSE '[]'::jsonb END) WITH ORDINALITY AS t(option_value, ordinality)
ON CONFLICT (field_id, value) DO NOTHING;

-- Copia os valores que estavam no jsonb de cada registro, cada um na coluna do
-- seu tipo. Seleção múltipla vira uma linha por opção.
CREATE OR REPLACE FUNCTION spark_backfill_custom_values(source_table text, source_entity text) RETURNS void AS $$
BEGIN
  EXECUTE format($sql$
    INSERT INTO custom_field_values (id, org_id, field_id, entity_type, entity_id, value_text, value_number, value_money, value_date, value_timestamp, value_boolean, option_id)
    SELECT gen_random_uuid(), r.org_id, d.id, %L, r.id,
      CASE WHEN d.type IN ('text','paragraph','phone','url') THEN trim(both '"' from entry.value::text) END,
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
  $sql$, source_entity, source_table, source_entity);

  EXECUTE format($sql$
    INSERT INTO custom_field_values (id, org_id, field_id, entity_type, entity_id, option_id)
    SELECT gen_random_uuid(), r.org_id, d.id, %L, r.id, o.id
    FROM %I r
    JOIN custom_field_definitions d ON d.org_id = r.org_id AND d.entity_type = %L
    CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.custom_fields) = 'object' THEN r.custom_fields ELSE '{}'::jsonb END) AS entry(key, value)
    CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(entry.value) = 'array' THEN entry.value ELSE '[]'::jsonb END) AS chosen(option_value)
    JOIN custom_field_options o ON o.field_id = d.id AND o.value = chosen.option_value
    WHERE entry.key = d.key AND d.type = 'multi_select' AND jsonb_typeof(entry.value) = 'array'
  $sql$, source_entity, source_table, source_entity);
END;
$$ LANGUAGE plpgsql;

SELECT spark_backfill_custom_values('contacts', 'contact');
SELECT spark_backfill_custom_values('companies', 'company');
SELECT spark_backfill_custom_values('deals', 'deal');
DROP FUNCTION spark_backfill_custom_values(text, text);

ALTER PUBLICATION electric_publication_default ADD TABLE custom_field_options;
ALTER PUBLICATION electric_publication_default ADD TABLE custom_field_values;
