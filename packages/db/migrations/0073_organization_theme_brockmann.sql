-- Expansão: valores existentes continuam válidos; nenhum tema é sobrescrito.
ALTER TABLE organization_themes DROP CONSTRAINT organization_themes_fonts_check;
ALTER TABLE organization_themes ADD CONSTRAINT organization_themes_fonts_check CHECK (
  font_body IN ('brockmann', 'geist', 'inter', 'system', 'rounded', 'serif') AND
  font_display IN ('brockmann', 'geist', 'inter', 'system', 'rounded', 'serif')
);
