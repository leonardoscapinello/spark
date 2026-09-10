-- Publicação de replicação lógica pro Electric consumir (docs/adr/0018).
-- Escopada só nas tabelas que de fato sincronizam pro cliente — nunca
-- "FOR ALL TABLES". Tabela nova que deve sincronizar precisa de
-- ALTER PUBLICATION ... ADD TABLE numa migration própria, nunca just
-- aparecer sozinha: é uma decisão consciente por tabela (docs/adr/0018,
-- "local-first não é baixar tudo").
CREATE PUBLICATION electric_publication_default FOR TABLE organizations, contacts;
