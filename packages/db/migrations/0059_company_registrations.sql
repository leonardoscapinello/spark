-- Cadastro público da Receita Federal, por CNPJ.
--
-- Não é `companies`: lá está o que a organização escreve e edita; aqui está o
-- que o governo publica, que ninguém edita e que só é buscado de novo quando
-- envelhece. Separar é o que impede a próxima consulta de apagar o que uma
-- pessoa digitou.
--
-- Tudo em coluna (ADR-0035). CNAE, quadro societário e regime tributário em
-- tabelas próprias: é o que permite perguntar ao banco «quais empresas do meu
-- funil são deste CNAE e estão baixadas» sem abrir documento nenhum.
CREATE TABLE company_registrations (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  tax_id text NOT NULL,

  legal_name text,
  trade_name text,

  registration_status text,
  registration_status_code integer,
  registration_status_date date,
  registration_status_reason text,
  special_status text,
  special_status_date date,

  head_office boolean,
  opened_on date,

  legal_nature text,
  legal_nature_code integer,
  size text,
  size_code integer,
  -- Centavos inteiros. bigint porque o capital social de uma companhia aberta
  -- passa de dois bilhões de centavos com folga.
  share_capital bigint,

  street_kind text,
  street text,
  street_number text,
  complement text,
  district text,
  postal_code text,
  city text,
  city_ibge_code integer,
  state text,
  country text,
  foreign_city text,

  phone text,
  secondary_phone text,
  fax text,
  email text,

  simples_optant boolean,
  simples_opted_on date,
  simples_left_on date,
  mei_optant boolean,
  mei_opted_on date,
  mei_left_on date,

  federative_entity text,

  source text NOT NULL,
  status text NOT NULL,
  http_status integer,
  fetched_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_registrations_tax_id_check CHECK (tax_id ~ '^[0-9]{14}$'),
  CONSTRAINT company_registrations_status_check CHECK (status = ANY (ARRAY['ready', 'not_found', 'failed'])),
  CONSTRAINT company_registrations_failure_count_check CHECK (failure_count >= 0),
  CONSTRAINT company_registrations_http_status_check CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599)
);
CREATE UNIQUE INDEX company_registrations_org_tax_id_uidx ON company_registrations (org_id, tax_id);
CREATE INDEX company_registrations_org_expires_idx ON company_registrations (org_id, expires_at);
CREATE INDEX company_registrations_org_legal_name_idx ON company_registrations (org_id, legal_name);
ALTER TABLE company_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_registrations_isolation_by_org ON company_registrations FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON company_registrations TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE company_registrations;

CREATE TABLE company_registration_activities (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  registration_id uuid NOT NULL REFERENCES company_registrations(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  main boolean NOT NULL,
  sort_order integer NOT NULL,
  CONSTRAINT company_registration_activities_code_check CHECK (code ~ '^[0-9]{7,}$')
);
CREATE INDEX company_registration_activities_registration_idx ON company_registration_activities (registration_id);
CREATE INDEX company_registration_activities_org_code_idx ON company_registration_activities (org_id, code);
ALTER TABLE company_registration_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_registration_activities_isolation_by_org ON company_registration_activities FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON company_registration_activities TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE company_registration_activities;

CREATE TABLE company_registration_members (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  registration_id uuid NOT NULL REFERENCES company_registrations(id) ON DELETE CASCADE,
  name text NOT NULL,
  masked_tax_id text,
  role text,
  role_code integer,
  joined_on date,
  age_range text,
  country text,
  legal_representative text,
  legal_representative_masked_tax_id text,
  legal_representative_role text,
  sort_order integer NOT NULL
);
CREATE INDEX company_registration_members_registration_idx ON company_registration_members (registration_id);
CREATE INDEX company_registration_members_org_name_idx ON company_registration_members (org_id, name);
ALTER TABLE company_registration_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_registration_members_isolation_by_org ON company_registration_members FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON company_registration_members TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE company_registration_members;

CREATE TABLE company_registration_tax_regimes (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  registration_id uuid NOT NULL REFERENCES company_registrations(id) ON DELETE CASCADE,
  year integer NOT NULL,
  taxation text,
  bookkeeping_count integer,
  scp_tax_id text
);
CREATE INDEX company_registration_tax_regimes_registration_idx ON company_registration_tax_regimes (registration_id);
ALTER TABLE company_registration_tax_regimes ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_registration_tax_regimes_isolation_by_org ON company_registration_tax_regimes FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON company_registration_tax_regimes TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE company_registration_tax_regimes;
