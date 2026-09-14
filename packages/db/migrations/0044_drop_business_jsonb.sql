-- O fim do expand/contract do ADR-0035: as colunas jsonb de dado de negócio saem.
--
-- Cada uma destas tinha uma tabela equivalente criada e preenchida nas
-- migrations 0038 a 0043, e todo o código já lê e grava de lá. O que resta
-- aqui é a parte "contract": remover a fonte duplicada, para que não exista
-- caminho em que os dois discordem.
--
-- O que NÃO sai, e por quê (é a classificação do próprio ADR):
--   automations.draft_graph, automation_versions.graph   desenho de fluxo
--   automation_runs.context, automation_run_steps.result  payload de execução
--   pages.draft_tree, page_versions.tree                  árvore de conteúdo
--   events.data, audit_logs.data                          registro append-only
--   email_verifications.raw_result                        prova de serviço externo
-- Esses são documento: lidos e gravados inteiros, sem ninguém filtrar por
-- dentro. Os demais viraram coluna.

-- Campos personalizados → custom_field_values (0038)
ALTER TABLE contacts DROP COLUMN custom_fields;
ALTER TABLE companies DROP COLUMN custom_fields;
ALTER TABLE deals DROP COLUMN custom_fields;

-- Opções de campo de seleção → custom_field_options (0038)
ALTER TABLE custom_field_definitions DROP COLUMN options;

-- Marcações → tags + vínculo por entidade (0040)
ALTER TABLE contacts DROP COLUMN tags;
ALTER TABLE companies DROP COLUMN tags;
ALTER TABLE products DROP COLUMN tags;

-- Capacidades → permission_group_capabilities (0041)
ALTER TABLE permission_groups DROP COLUMN capabilities;

-- Desenho e respostas de formulário → lead_form_fields / form_submission_values (0041, 0043)
ALTER TABLE lead_forms DROP COLUMN fields;
ALTER TABLE form_submissions DROP COLUMN values;

-- Configuração de integração → integration_connection_settings (0042)
ALTER TABLE integration_connections DROP COLUMN config;
