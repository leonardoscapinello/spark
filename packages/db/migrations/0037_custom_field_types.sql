-- As restrições CHECK ficaram para trás dos tipos que o core passou a aceitar
-- (migrations anteriores mexeram só no TypeScript): criar um campo de moeda,
-- data e hora, telefone, endereço web ou texto longo era recusado pelo banco,
-- e o mesmo para campo de conversa ou de atividade.
ALTER TABLE custom_field_definitions DROP CONSTRAINT custom_field_definitions_type_check;
ALTER TABLE custom_field_definitions ADD CONSTRAINT custom_field_definitions_type_check
  CHECK (type = ANY (ARRAY['text','paragraph','number','currency','date','datetime','phone','url','boolean','single_select','multi_select']));

ALTER TABLE custom_field_definitions DROP CONSTRAINT custom_field_definitions_entity_type_check;
ALTER TABLE custom_field_definitions ADD CONSTRAINT custom_field_definitions_entity_type_check
  CHECK (entity_type = ANY (ARRAY['contact','company','deal','conversation','activity']));
