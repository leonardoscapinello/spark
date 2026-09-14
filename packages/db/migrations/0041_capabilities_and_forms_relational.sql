-- Capacidades de grupo e formulários deixam o JSON (ADR-0035).
--
-- `permission_groups.capabilities` era um array: não dava para perguntar quem
-- pode fechar negócio sem varrer todos os grupos, e o banco aceitava qualquer
-- texto como se fosse capacidade.
--
-- `lead_forms.fields` guardava a definição dos campos do formulário — que são
-- entidades, com tipo, rótulo e ordem — e `form_submissions.values` guardava a
-- resposta de cada pessoa num objeto, o que impedia qualquer relatório sobre o
-- que foi respondido.

CREATE TABLE permission_group_capabilities (
  org_id uuid NOT NULL REFERENCES organizations(id),
  group_id uuid NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  capability text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, capability)
);
CREATE INDEX permission_group_capabilities_capability_idx ON permission_group_capabilities (org_id, capability);

CREATE TABLE lead_form_fields (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  form_id uuid NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
  -- Chave usada na resposta; estável mesmo se o rótulo mudar.
  key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_form_fields_unique UNIQUE (form_id, key)
);
CREATE INDEX lead_form_fields_form_idx ON lead_form_fields (org_id, form_id, sort_order);

CREATE TABLE lead_form_field_options (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  field_id uuid NOT NULL REFERENCES lead_form_fields(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT lead_form_field_options_unique UNIQUE (field_id, value)
);

CREATE TABLE form_submission_values (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  submission_id uuid NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  -- A resposta guarda a chave respondida, e aponta para o campo quando ele
  -- ainda existe: apagar um campo do formulário não apaga o que foi respondido.
  field_id uuid REFERENCES lead_form_fields(id) ON DELETE SET NULL,
  field_key text NOT NULL,
  value_text text,
  value_number numeric(20, 6),
  value_boolean boolean,
  value_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_submission_values_unique UNIQUE (submission_id, field_key),
  CONSTRAINT form_submission_values_one_value_check CHECK (
    (CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_number IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_date IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);
CREATE INDEX form_submission_values_submission_idx ON form_submission_values (org_id, submission_id);
CREATE INDEX form_submission_values_field_idx ON form_submission_values (org_id, field_key, value_text) WHERE value_text IS NOT NULL;

ALTER TABLE permission_group_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submission_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY permission_group_capabilities_isolation_by_org ON permission_group_capabilities FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY lead_form_fields_isolation_by_org ON lead_form_fields FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY lead_form_field_options_isolation_by_org ON lead_form_field_options FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY form_submission_values_isolation_by_org ON form_submission_values FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON permission_group_capabilities TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_form_fields TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_form_field_options TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON form_submission_values TO app_user;

INSERT INTO permission_group_capabilities (org_id, group_id, capability)
SELECT g.org_id, g.id, c.capability
FROM permission_groups g
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(g.capabilities) = 'array' THEN g.capabilities ELSE '[]'::jsonb END) AS c(capability)
ON CONFLICT DO NOTHING;

INSERT INTO lead_form_fields (id, org_id, form_id, key, label, type, required, placeholder, sort_order)
SELECT gen_random_uuid(), f.org_id, f.id,
  coalesce(item.value->>'id', item.value->>'key', 'campo_' || item.ordinality),
  coalesce(item.value->>'label', 'Campo'),
  coalesce(item.value->>'type', 'text'),
  coalesce((item.value->>'required')::boolean, false),
  item.value->>'placeholder',
  (item.ordinality - 1)::integer
FROM lead_forms f
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(f.fields) = 'array' THEN f.fields ELSE '[]'::jsonb END) WITH ORDINALITY AS item(value, ordinality)
ON CONFLICT (form_id, key) DO NOTHING;

INSERT INTO lead_form_field_options (id, org_id, field_id, value, label, sort_order)
SELECT gen_random_uuid(), lf.org_id, lf.id, o.value, o.value, (o.ordinality - 1)::integer
FROM lead_forms f
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(f.fields) = 'array' THEN f.fields ELSE '[]'::jsonb END) AS item(value)
JOIN lead_form_fields lf ON lf.form_id = f.id AND lf.key = coalesce(item.value->>'id', item.value->>'key')
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(item.value->'options') = 'array' THEN item.value->'options' ELSE '[]'::jsonb END) WITH ORDINALITY AS o(value, ordinality)
ON CONFLICT (field_id, value) DO NOTHING;

INSERT INTO form_submission_values (id, org_id, submission_id, field_id, field_key, value_text, value_boolean)
SELECT gen_random_uuid(), s.org_id, s.id, lf.id, entry.key,
  CASE WHEN jsonb_typeof(entry.value) <> 'boolean' THEN entry.value#>>'{}' END,
  CASE WHEN jsonb_typeof(entry.value) = 'boolean' THEN (entry.value#>>'{}')::boolean END
FROM form_submissions s
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(s.values) = 'object' THEN s.values ELSE '{}'::jsonb END) AS entry(key, value)
LEFT JOIN lead_form_fields lf ON lf.form_id = s.form_id AND lf.key = entry.key
WHERE entry.value IS NOT NULL AND entry.value <> 'null'::jsonb
ON CONFLICT (submission_id, field_key) DO NOTHING;

ALTER PUBLICATION electric_publication_default ADD TABLE permission_group_capabilities;
ALTER PUBLICATION electric_publication_default ADD TABLE lead_form_fields;
ALTER PUBLICATION electric_publication_default ADD TABLE lead_form_field_options;
ALTER PUBLICATION electric_publication_default ADD TABLE form_submission_values;
