-- Campo de e-mail e campo de documento (CPF ou CNPJ). O core valida os dois —
-- e-mail pela mesma regra do e-mail da pessoa, documento pelo dígito
-- verificador, não só pelo tamanho. Sem soltar o CHECK aqui, criar o campo era
-- recusado pelo banco, como já aconteceu em 0037.
ALTER TABLE custom_field_definitions DROP CONSTRAINT custom_field_definitions_type_check;
ALTER TABLE custom_field_definitions ADD CONSTRAINT custom_field_definitions_type_check
  CHECK (type = ANY (ARRAY['text','paragraph','number','currency','date','datetime','phone','email','document','url','boolean','single_select','multi_select']));
