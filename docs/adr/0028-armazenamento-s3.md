# ADR-0028 — Armazenamento: um adaptador S3, provedor trocável por configuração

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

A empresa vai contratar um bucket S3 em breve, e a exigência é clara: **todo arquivo do sistema vive lá** — mídia de conversa, avatar, importação/exportação de CSV, criativo de campanha, asset de página, PDF gerado.

## Decisão

**`packages/storage`: um único adaptador sobre o SDK oficial da AWS (`@aws-sdk/client-s3`), configurado por variável de ambiente.** Qualquer endpoint que fale a API S3 funciona sem mudar código — é a razão de escolher esse SDK e não o cliente proprietário de um provedor.

- **Hoje**, antes do contrato dedicado: endpoint S3-compatível do próprio Supabase Storage — já pago no plano, zero custo novo.
- **Quando o bucket for contratado** (AWS S3 ou Cloudflare R2, ambos falam a mesma API): troca de `endpoint`, `bucket` e credenciais. **Nenhuma linha de código muda.**
- Metadado (dono, `org_id`, tamanho, mime, status de verificação) fica no Postgres, como tudo ([ADR-0022](0022-um-so-banco-postgres.md)) — só os bytes vão para o S3.
- Upload e download por **URL pré-assinada**. O NestJS nunca faz proxy de bytes.
- Um bucket por ambiente, chave prefixada por `org_id` — isolamento e regra de ciclo de vida (expurgo de exportação temporária) por prefixo.

## Alternativas consideradas

**SDK proprietário do Supabase Storage.** Descartado: prenderia o código ao provedor atual, contrariando o plano explícito de trocar para S3 dedicado.

**Upload direto por módulo, sem adaptador único.** Descartado: cada módulo reinventaria política de nome de chave, expiração de URL e verificação — exatamente o tipo de duplicação que o projeto existe para evitar.

## Consequências

- Um só lugar entende "arquivo" no sistema inteiro. Módulo novo que lida com arquivo importa `packages/storage`, não escreve cliente próprio.
- A migração para o S3 contratado é config, testada pela mesma suíte — sem código a rever.
- CORS do bucket precisa ser configurado por ambiente para a URL pré-assinada funcionar do navegador.
