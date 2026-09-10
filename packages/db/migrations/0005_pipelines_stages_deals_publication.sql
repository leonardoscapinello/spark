-- CRM (roadmap.md, Fase 1) é tela de trabalho — lê de coleção local, não
-- da API (docs/adr/0026). Mesma regra da migration 0002: tabela nova que
-- sincroniza é decisão consciente, nunca "FOR ALL TABLES".
ALTER PUBLICATION electric_publication_default ADD TABLE pipelines, stages, deals;
