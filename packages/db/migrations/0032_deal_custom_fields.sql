-- Campos personalizados no negócio (o core já aceitava entityType "deal", a
-- tabela é que não tinha onde guardar). Expand: negócios existentes nascem com
-- objeto vazio, e quem lê antes desta versão simplesmente ignora a coluna.
ALTER TABLE deals ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
