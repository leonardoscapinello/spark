-- Precificação do negócio (ADR-0046): itens com desconto em valor e cobrança
-- recorrente; ajustes do negócio (desconto, cupom, taxa); cupons
-- pré-configurados; política de parcelamento com juros da empresa; condições
-- de cobrança no negócio. Só expansão: nada existente muda de significado.
BEGIN;

CREATE TABLE installment_policies (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  max_installments integer NOT NULL CHECK (max_installments BETWEEN 1 AND 48),
  interest_free_installments integer NOT NULL DEFAULT 1 CHECK (interest_free_installments BETWEEN 1 AND 48),
  monthly_interest_basis_points integer NOT NULL DEFAULT 0 CHECK (monthly_interest_basis_points BETWEEN 0 AND 10000),
  minimum_installment bigint NOT NULL DEFAULT 0 CHECK (minimum_installment >= 0),
  upfront_discount_basis_points integer NOT NULL DEFAULT 0 CHECK (upfront_discount_basis_points BETWEEN 0 AND 10000),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX installment_policies_org_idx ON installment_policies (org_id);
-- No máximo uma política padrão por organização.
CREATE UNIQUE INDEX installment_policies_default_idx ON installment_policies (org_id) WHERE is_default;
ALTER TABLE installment_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY installment_policies_isolation_by_org ON installment_policies FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON installment_policies TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE installment_policies;

CREATE TABLE coupons (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  description text,
  value_type text NOT NULL CHECK (value_type IN ('percent', 'amount')),
  basis_points integer NOT NULL DEFAULT 0 CHECK (basis_points BETWEEN 0 AND 10000),
  amount bigint NOT NULL DEFAULT 0 CHECK (amount >= 0),
  applies_to text NOT NULL DEFAULT 'once' CHECK (applies_to IN ('once', 'recurring')),
  cycles integer CHECK (cycles > 0),
  minimum_subtotal bigint CHECK (minimum_subtotal >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer CHECK (max_redemptions > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX coupons_org_code_idx ON coupons (org_id, code);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY coupons_isolation_by_org ON coupons FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON coupons TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE coupons;

CREATE TABLE deal_adjustments (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('discount', 'coupon', 'fee')),
  label text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('percent', 'amount')),
  basis_points integer NOT NULL DEFAULT 0 CHECK (basis_points BETWEEN 0 AND 10000),
  amount bigint NOT NULL DEFAULT 0 CHECK (amount >= 0),
  applies_to text NOT NULL DEFAULT 'once' CHECK (applies_to IN ('once', 'recurring')),
  cycles integer CHECK (cycles > 0),
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_adjustments_deal_idx ON deal_adjustments (org_id, deal_id, sort_order);
CREATE INDEX deal_adjustments_coupon_idx ON deal_adjustments (org_id, coupon_id);
ALTER TABLE deal_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_adjustments_isolation_by_org ON deal_adjustments FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON deal_adjustments TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE deal_adjustments;

ALTER TABLE deal_products
  ADD COLUMN discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN recurring boolean NOT NULL DEFAULT false;

ALTER TABLE deals
  ADD COLUMN subscription_interval text CHECK (subscription_interval IN ('month', 'quarter', 'semester', 'year')),
  ADD COLUMN subscription_cycles integer CHECK (subscription_cycles > 0),
  ADD COLUMN contract_months integer NOT NULL DEFAULT 12 CHECK (contract_months BETWEEN 1 AND 120),
  ADD COLUMN installment_policy_id uuid REFERENCES installment_policies(id) ON DELETE SET NULL,
  ADD COLUMN installments integer NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 48);

COMMIT;
