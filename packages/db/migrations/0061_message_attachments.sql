-- Mídia recebida (áudio, imagem, documento) vira um `files` normal — nenhum
-- caminho de armazenamento próprio para mensagem, mesma regra do resto do
-- produto (ADR-0028). A mensagem só guarda a referência.
ALTER TABLE messages ADD COLUMN attachment_file_id uuid REFERENCES files(id);
