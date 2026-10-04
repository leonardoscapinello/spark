BEGIN;
CREATE TABLE custom_field_groups (id uuid PRIMARY KEY,org_id uuid NOT NULL REFERENCES organizations(id),entity_type text NOT NULL,name text NOT NULL,sort_order integer NOT NULL DEFAULT 0,archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(org_id,id,entity_type));
CREATE INDEX custom_field_groups_org_entity ON custom_field_groups(org_id,entity_type);
ALTER TABLE custom_field_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_field_groups_org ON custom_field_groups TO app_user USING(org_id=current_setting('app.current_org_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON custom_field_groups TO app_user;
ALTER PUBLICATION electric_publication_default ADD TABLE custom_field_groups;
ALTER TABLE custom_field_definitions ADD COLUMN group_id uuid, ADD COLUMN sort_order integer NOT NULL DEFAULT 0, ADD FOREIGN KEY(org_id,group_id,entity_type) REFERENCES custom_field_groups(org_id,id,entity_type);
ALTER TABLE custom_field_definitions DROP CONSTRAINT custom_field_definitions_entity_type_check;
ALTER TABLE custom_field_definitions ADD CONSTRAINT custom_field_definitions_entity_type_check CHECK(entity_type IN ('contact','company','deal','conversation','activity','user','campaign','service_cycle'));
ALTER TABLE custom_field_values DROP CONSTRAINT custom_field_values_entity_type_check;
ALTER TABLE custom_field_values ADD CONSTRAINT custom_field_values_entity_type_check CHECK(entity_type IN ('contact','company','deal','conversation','activity','user','campaign','service_cycle'));
CREATE OR REPLACE FUNCTION enforce_custom_field_entity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE target_table text; target_exists boolean;
BEGIN
 target_table := CASE NEW.entity_type WHEN 'contact' THEN 'contacts' WHEN 'company' THEN 'companies' WHEN 'deal' THEN 'deals' WHEN 'conversation' THEN 'conversations' WHEN 'activity' THEN 'activities' WHEN 'user' THEN 'users' WHEN 'campaign' THEN 'campaigns' WHEN 'service_cycle' THEN 'service_cycles' END;
 IF target_table IS NULL THEN RAISE EXCEPTION 'unsupported custom field entity type' USING ERRCODE='23514'; END IF;
 EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id=$1 AND org_id=$2)',target_table) INTO target_exists USING NEW.entity_id,NEW.org_id;
 IF NOT target_exists THEN RAISE EXCEPTION 'custom field target does not exist in this organization' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
COMMIT;
