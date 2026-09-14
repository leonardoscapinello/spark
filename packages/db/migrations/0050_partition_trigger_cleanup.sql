-- 0047 percorreu também as partições físicas de events. Triggers declarados no
-- pai já são clonados pelo Postgres; remove apenas as cópias independentes
-- criadas diretamente nas partições, mantendo um único guard por FK/escrita.
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT c.oid::regclass::text AS table_name, t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relispartition AND NOT t.tgisinternal AND t.tgparentid = 0
      AND t.tgname LIKE 'tenant_fk_guard_%'
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %s', item.tgname, item.table_name);
  END LOOP;
END $$;
