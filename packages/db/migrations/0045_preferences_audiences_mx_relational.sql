-- Mais três colunas jsonb que não eram documento, e por isso viram coluna.
--
-- O ADR-0035 classificou estas como "documento" numa primeira leitura. Olhando
-- de novo com a régua certa — «alguém vai querer filtrar, agrupar ou juntar
-- por isso?» — as três respondem sim:
--
--   user_preferences.value      é escalar ou lista curta; nada aqui é opaco
--   audiences.filter            é a definição de um público: operador, etapas,
--                               marcações e pontuação mínima, cada um um dado
--   email_verifications.mx_records  é uma lista de servidores, um por linha
--
-- A resposta crua do verificador (`raw_result`) continua jsonb: aquilo é prova
-- do que o serviço externo respondeu, guardada inteira e lida inteira.

-- ---------------------------------------------------------------- preferências
-- Uma coluna por tipo para o valor escalar; lista e objeto viram linhas em
-- `user_preference_items`, onde `sort_order` guarda a ordem de uma lista e
-- `item_key` a chave de um objeto.
-- `value_kind` diz qual coluna vale, e distingue lista vazia de objeto vazio —
-- duas coisas diferentes que nenhuma coluna de valor conseguiria separar.
ALTER TABLE user_preferences ADD COLUMN value_kind text NOT NULL DEFAULT 'text';
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_value_kind_check
  CHECK (value_kind = ANY (ARRAY['text', 'number', 'boolean', 'list', 'object']));
ALTER TABLE user_preferences ADD COLUMN value_text text;
ALTER TABLE user_preferences ADD COLUMN value_number numeric(20, 6);
ALTER TABLE user_preferences ADD COLUMN value_boolean boolean;

CREATE TABLE user_preference_items (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  preference_id uuid NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
  -- Nulo numa lista; a chave, num objeto.
  item_key text,
  sort_order integer NOT NULL DEFAULT 0,
  value_text text,
  value_number numeric(20, 6),
  value_boolean boolean,
  CONSTRAINT user_preference_items_one_value_check CHECK (
    (CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_number IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);
CREATE INDEX user_preference_items_preference_idx ON user_preference_items (org_id, preference_id, sort_order);

ALTER TABLE user_preference_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preference_items_isolation_by_org ON user_preference_items FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preference_items TO app_user;

UPDATE user_preferences SET value_kind = CASE jsonb_typeof(value)
  WHEN 'boolean' THEN 'boolean' WHEN 'number' THEN 'number'
  WHEN 'array' THEN 'list' WHEN 'object' THEN 'object' ELSE 'text' END;

-- Escalar vai para a coluna do seu tipo.
UPDATE user_preferences SET value_boolean = (value #>> '{}')::boolean WHERE jsonb_typeof(value) = 'boolean';
UPDATE user_preferences SET value_number = (value #>> '{}')::numeric WHERE jsonb_typeof(value) = 'number';
UPDATE user_preferences SET value_text = value #>> '{}' WHERE jsonb_typeof(value) = 'string';

-- Lista vira uma linha por item, preservando a ordem.
INSERT INTO user_preference_items (id, org_id, preference_id, sort_order, value_text)
SELECT gen_random_uuid(), p.org_id, p.id, (item.ordinality - 1)::integer, item.value
FROM user_preferences p
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(p.value) = 'array' THEN p.value ELSE '[]'::jsonb END
) WITH ORDINALITY AS item(value, ordinality);

-- Objeto vira uma linha por chave.
INSERT INTO user_preference_items (id, org_id, preference_id, item_key, value_text, value_number, value_boolean)
SELECT gen_random_uuid(), p.org_id, p.id, entry.key,
  CASE WHEN jsonb_typeof(entry.value) IN ('string', 'object', 'array') THEN entry.value #>> '{}' END,
  CASE WHEN jsonb_typeof(entry.value) = 'number' THEN (entry.value #>> '{}')::numeric END,
  CASE WHEN jsonb_typeof(entry.value) = 'boolean' THEN (entry.value #>> '{}')::boolean END
FROM user_preferences p
CROSS JOIN LATERAL jsonb_each(
  CASE WHEN jsonb_typeof(p.value) = 'object' THEN p.value ELSE '{}'::jsonb END
) AS entry(key, value);

ALTER TABLE user_preferences DROP COLUMN value;

-- ------------------------------------------------------------------- públicos
-- O público deixa de ser um objeto e passa a ser o que ele é: um operador, uma
-- pontuação mínima, e duas listas que apontam para dado que já existe.
ALTER TABLE audiences ADD COLUMN operator text NOT NULL DEFAULT 'all';
ALTER TABLE audiences ADD COLUMN minimum_score integer;
ALTER TABLE audiences ADD CONSTRAINT audiences_operator_check CHECK (operator = ANY (ARRAY['all', 'any']));

CREATE TABLE audience_lead_statuses (
  org_id uuid NOT NULL REFERENCES organizations(id),
  audience_id uuid NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  lead_status text NOT NULL,
  PRIMARY KEY (audience_id, lead_status)
);
CREATE INDEX audience_lead_statuses_org_idx ON audience_lead_statuses (org_id, lead_status);

-- Aponta para o catálogo de marcações (migration 0040): «quais públicos usam
-- esta marcação?» vira uma junção, e apagar a marcação não deixa texto solto.
CREATE TABLE audience_tags (
  org_id uuid NOT NULL REFERENCES organizations(id),
  audience_id uuid NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (audience_id, tag_id)
);
CREATE INDEX audience_tags_org_idx ON audience_tags (org_id, tag_id);

ALTER TABLE audience_lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY audience_lead_statuses_isolation_by_org ON audience_lead_statuses FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY audience_tags_isolation_by_org ON audience_tags FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON audience_lead_statuses TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON audience_tags TO app_user;

UPDATE audiences SET
  operator = CASE WHEN filter->>'operator' = ANY (ARRAY['all', 'any']) THEN filter->>'operator' ELSE 'all' END,
  minimum_score = CASE WHEN jsonb_typeof(filter->'minimumScore') = 'number' THEN (filter->>'minimumScore')::integer END
WHERE jsonb_typeof(filter) = 'object';

INSERT INTO audience_lead_statuses (org_id, audience_id, lead_status)
SELECT DISTINCT a.org_id, a.id, item.value
FROM audiences a
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(a.filter->'leadStatuses') = 'array' THEN a.filter->'leadStatuses' ELSE '[]'::jsonb END
) AS item(value)
WHERE item.value <> ''
ON CONFLICT DO NOTHING;

-- A marcação citada pelo público pode não estar no catálogo ainda: cria-a, com
-- a mesma normalização de `tagSlug` (packages/core/rules/tag.ts).
INSERT INTO tags (id, org_id, name, slug)
SELECT DISTINCT ON (a.org_id, lower(btrim(item.value)))
  gen_random_uuid(), a.org_id, btrim(item.value), lower(btrim(item.value))
FROM audiences a
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(a.filter->'tags') = 'array' THEN a.filter->'tags' ELSE '[]'::jsonb END
) AS item(value)
WHERE btrim(item.value) <> ''
ON CONFLICT (org_id, slug) DO NOTHING;

INSERT INTO audience_tags (org_id, audience_id, tag_id)
SELECT DISTINCT a.org_id, a.id, t.id
FROM audiences a
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(a.filter->'tags') = 'array' THEN a.filter->'tags' ELSE '[]'::jsonb END
) AS item(value)
JOIN tags t ON t.org_id = a.org_id AND t.slug = lower(btrim(item.value))
ON CONFLICT DO NOTHING;

ALTER TABLE audiences DROP COLUMN filter;

-- --------------------------------------------------------------- servidores MX
-- `email_verifications` tem chave natural (org_id, email) — é assim que a
-- verificação é procurada, e é por ela que o vínculo aponta.
CREATE TABLE email_verification_mx_records (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  email text NOT NULL,
  host text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT email_verification_mx_records_verification_fk
    FOREIGN KEY (org_id, email) REFERENCES email_verifications(org_id, email) ON DELETE CASCADE,
  CONSTRAINT email_verification_mx_records_unique UNIQUE (org_id, email, host)
);
CREATE INDEX email_verification_mx_records_verification_idx ON email_verification_mx_records (org_id, email, sort_order);

ALTER TABLE email_verification_mx_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_verification_mx_records_isolation_by_org ON email_verification_mx_records FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON email_verification_mx_records TO app_user;

INSERT INTO email_verification_mx_records (id, org_id, email, host, sort_order)
SELECT gen_random_uuid(), v.org_id, v.email, item.value, (item.ordinality - 1)::integer
FROM email_verifications v
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(v.mx_records) = 'array' THEN v.mx_records ELSE '[]'::jsonb END
) WITH ORDINALITY AS item(value, ordinality)
WHERE item.value <> ''
ON CONFLICT (org_id, email, host) DO NOTHING;

ALTER TABLE email_verifications DROP COLUMN mx_records;
