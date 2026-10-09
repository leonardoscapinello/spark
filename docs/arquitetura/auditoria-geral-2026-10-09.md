# Auditoria geral — 9 de outubro de 2026

Status: em andamento. Não equivale a certificação de ausência de vulnerabilidades.

## Escopo fechado

1. Atualizar remoto e preservar trabalho local.
2. Construção, tipos, lint, testes e orçamento de bundle.
3. Autenticação, capacidades, isolamento de organização, sync, webhooks, arquivos e URLs externas.
4. Dinheiro, descontos, cupons, recorrência, parcelamento e consistência transacional.
5. Estado local, limpeza de recursos, fluxos de interface e campos.
6. Dependências de produção, registro das limitações, commits e push com conferência do remoto.

## Evidências e correções em andamento

- `git pull --ff-only`: atualizado; main tinha 86 commits locais à frente do remoto.
- Primeiro `pnpm check:full`: interrompido por lint de protótipos externos não versionados na pasta Brockmann. Referência excluída do lint por caminho específico; arquivos preservados.
- Parcelamento: opções não podem parar no primeiro mínimo inválido, porque o início da cobrança de juros pode tornar uma opção posterior válida. Regressão adicionada.
- Parcelamento: quantidade fracionária/NaN/infinita agora é rejeitada, sem truncamento silencioso. Regressão adicionada.
- Cupom: aquisição de lock na linha antes da leitura dos usos, serializando aplicações concorrentes do mesmo cupom.
- Auditoria de dependências de produção: 22 alertas (1 crítico, 9 altos, 11 moderados, 1 baixo). Correção pendente; resultado local em `/tmp/spark-audit-dependencies-20261009.json`.
- Segunda checagem completa passou: 72 tarefas, 59,087 s. Log `/tmp/spark-audit-full-20261009-2.log`.

## Pendências de revisão

- Dependências atualizadas: Fastify, adaptador Nest e Nodemailer; overrides de correções compatíveis para transitivas. `pnpm audit --prod --json`: zero alertas em 508 dependências. Checagem completa de compatibilidade passou: 72 tarefas, 36,639 s; log `/tmp/spark-check-dependencies.log`.
- Revisar concorrência do recálculo de itens/ajustes e termos sem itens.
- Revisar encerramento dos streams de sync (listener de close no request).
- Completar matriz de autorização/API/sync e entradas públicas; SSRF/XSS/arquivos.
- Completar revisão de frontend e performance, rodar orçamento, documentar cobertura e limitações.
- Commitar unidades validadas, enviar commits locais autorizados e conferir SHA remoto.

## Evidências da revisão de código

- Auth: guard valida JWT via JWKS; resolução de usuário nega usuário desativado; CapabilityGuard nega rota sem capacidade declarada.
- Sync: tabela permitida explicitamente, organização e usuário determinados no servidor, visões desconhecidas recusadas; pendente revisão do ciclo de vida do stream.
- Arquivos: controlador exige capacidades distintas de leitura/escrita; pendente revisão do conteúdo e armazenamento.
- Busca de sinks no frontend: sem `eval`, `new Function` ou HTML bruto nos diretórios de aplicação, UI e blocos. Mensagens do widget limitadas a tamanho/posição; aperfeiçoar validação de origem.
- Fila offline: confirmar correção do método de registro (Workbox default GET), vincular token renovado ao `sub` e `iss` originais, preservar falhas transitórias. Achados ainda não corrigidos.
- Link previews: checa DNS antes de fetch, mas a conexão resolve novamente (risco de rebinding); IPv6 mapeado hexadecimal escapa da checagem atual. Correção pendente.
