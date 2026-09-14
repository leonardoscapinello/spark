-- O campo de formulário precisa dizer para onde o valor vai.
--
-- A migração 0041 levou o desenho do formulário para linha, mas deixou de
-- fora o `mapping` — qual coluna do lead aquele campo alimenta (nome, e-mail,
-- telefone, empresa, ou nenhuma). Sem ele, `mappedLeadValue` não tem como
-- achar o e-mail na resposta e todo envio vira um lead sem identificação.
--
-- Expand/contract: a coluna entra com o mesmo padrão do schema Zod ('none') e
-- é preenchida a partir do jsonb que ainda existe em `lead_forms.fields`.

ALTER TABLE lead_form_fields ADD COLUMN mapping text NOT NULL DEFAULT 'none';

ALTER TABLE lead_form_fields ADD CONSTRAINT lead_form_fields_mapping_check
  CHECK (mapping = ANY (ARRAY['name', 'email', 'phone', 'company', 'none']));

-- Copia o mapeamento de cada campo do array jsonb, casando pela chave.
UPDATE lead_form_fields f
SET mapping = item.mapping
FROM lead_forms lf
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(lf.fields) = 'array' THEN lf.fields ELSE '[]'::jsonb END
) WITH ORDINALITY AS entry(value, ordinality)
CROSS JOIN LATERAL (
  SELECT
    coalesce(entry.value->>'id', entry.value->>'key', 'campo_' || entry.ordinality) AS key,
    coalesce(entry.value->>'mapping', 'none') AS mapping
) AS item
WHERE f.form_id = lf.id
  AND f.key = item.key
  AND item.mapping = ANY (ARRAY['name', 'email', 'phone', 'company', 'none']);
