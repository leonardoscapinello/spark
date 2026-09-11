UPDATE permission_groups
SET capabilities = capabilities || '["users:manage"]'::jsonb,
    updated_at = now()
WHERE name IN ('Proprietário', 'Administrador')
  AND NOT capabilities @> '["users:manage"]'::jsonb;
