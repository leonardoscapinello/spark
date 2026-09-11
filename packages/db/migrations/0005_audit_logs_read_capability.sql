UPDATE permission_groups
SET capabilities = capabilities || '["audit_logs:read"]'::jsonb,
    updated_at = now()
WHERE name IN ('Proprietário', 'Administrador')
  AND NOT capabilities @> '["audit_logs:read"]'::jsonb;
