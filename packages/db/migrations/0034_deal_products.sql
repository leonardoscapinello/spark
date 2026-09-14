-- Itens do negócio: o valor passa a ser a soma do que está sendo vendido
-- (packages/core/rules/dealProducts), como no Pipedrive. Quantidade em
-- milésimos e desconto/imposto em pontos-base — inteiros, pelo mesmo motivo
-- do dinheiro em centavos.
CREATE TABLE deal_products (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity_milli integer NOT NULL,
  unit_amount bigint NOT NULL,
  discount_basis_points integer NOT NULL DEFAULT 0,
  tax_basis_points integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_products_deal_idx ON deal_products (org_id, deal_id, sort_order);
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY deal_products_isolation_by_org ON deal_products FOR ALL TO app_user USING (org_id = current_setting('app.current_org_id', true)::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON deal_products TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE deal_products;
