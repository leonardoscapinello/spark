-- Marcações deixam de ser array jsonb e viram tabela (ADR-0035).
--
-- Antes cada pessoa, empresa e produto carregava `tags` como lista de texto
-- solta: não havia catálogo de marcações, renomear uma exigia varrer tudo,
-- não dava para contar quantos registros usam cada uma, e duas grafias da
-- mesma coisa ("VIP" e "vip") viravam marcações diferentes sem ninguém ver.

CREATE TABLE tags (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  -- Forma normalizada para comparação: minúscula e sem espaço nas pontas.
  -- É o que garante que "VIP" e "vip" sejam a mesma marcação.
  slug text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT tags_org_slug_unique UNIQUE (org_id, slug)
);
CREATE INDEX tags_org_idx ON tags (org_id) WHERE archived_at IS NULL;

-- Um vínculo por entidade marcável. Tabelas separadas, e não uma genérica com
-- entity_type: assim a chave estrangeira existe de verdade e o banco garante
-- que a marcação aponta para um registro que existe.
CREATE TABLE contact_tags (
  org_id uuid NOT NULL REFERENCES organizations(id),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);
CREATE INDEX contact_tags_tag_idx ON contact_tags (org_id, tag_id);

CREATE TABLE company_tags (
  org_id uuid NOT NULL REFERENCES organizations(id),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, tag_id)
);
CREATE INDEX company_tags_tag_idx ON company_tags (org_id, tag_id);

CREATE TABLE product_tags (
  org_id uuid NOT NULL REFERENCES organizations(id),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX product_tags_tag_idx ON product_tags (org_id, tag_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_isolation_by_org ON tags FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY contact_tags_isolation_by_org ON contact_tags FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY company_tags_isolation_by_org ON company_tags FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY product_tags_isolation_by_org ON product_tags FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_tags TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_tags TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_tags TO app_user;

-- Catálogo a partir do que já estava gravado, unindo grafias diferentes.
INSERT INTO tags (id, org_id, name, slug)
SELECT DISTINCT ON (org_id, lower(btrim(name))) gen_random_uuid(), org_id, btrim(name), lower(btrim(name))
FROM (
  SELECT c.org_id, t.name FROM contacts c CROSS JOIN LATERAL jsonb_array_elements_text(c.tags) AS t(name)
  UNION ALL
  SELECT co.org_id, t.name FROM companies co CROSS JOIN LATERAL jsonb_array_elements_text(co.tags) AS t(name)
  UNION ALL
  SELECT p.org_id, t.name FROM products p CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS t(name)
) AS todas
WHERE btrim(name) <> ''
ON CONFLICT (org_id, slug) DO NOTHING;

INSERT INTO contact_tags (org_id, contact_id, tag_id)
SELECT c.org_id, c.id, tg.id
FROM contacts c
CROSS JOIN LATERAL jsonb_array_elements_text(c.tags) AS t(name)
JOIN tags tg ON tg.org_id = c.org_id AND tg.slug = lower(btrim(t.name))
ON CONFLICT DO NOTHING;

INSERT INTO company_tags (org_id, company_id, tag_id)
SELECT co.org_id, co.id, tg.id
FROM companies co
CROSS JOIN LATERAL jsonb_array_elements_text(co.tags) AS t(name)
JOIN tags tg ON tg.org_id = co.org_id AND tg.slug = lower(btrim(t.name))
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (org_id, product_id, tag_id)
SELECT p.org_id, p.id, tg.id
FROM products p
CROSS JOIN LATERAL jsonb_array_elements_text(p.tags) AS t(name)
JOIN tags tg ON tg.org_id = p.org_id AND tg.slug = lower(btrim(t.name))
ON CONFLICT DO NOTHING;

ALTER PUBLICATION electric_publication_default ADD TABLE tags;
ALTER PUBLICATION electric_publication_default ADD TABLE contact_tags;
ALTER PUBLICATION electric_publication_default ADD TABLE company_tags;
ALTER PUBLICATION electric_publication_default ADD TABLE product_tags;
