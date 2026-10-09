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
- Auditoria inicial de dependências: 22 alertas; eliminados no commit `11311bd`, já enviado. Resultado final: `/tmp/spark-security-final.json`.
- Segunda checagem completa passou: 72 tarefas, 59,087 s. Log `/tmp/spark-audit-full-20261009-2.log`.

## Pendências de revisão

- Dependências atualizadas: Fastify, adaptador Nest e Nodemailer; overrides de correções compatíveis para transitivas. `pnpm audit --prod --json`: zero alertas em 508 dependências. Checagem completa de compatibilidade passou: 72 tarefas, 36,639 s; log `/tmp/spark-check-dependencies.log`.
- Itens, ajustes, cupons e condições agora adquirem lock no negócio antes das escritas dependentes. Alterar condições sem itens preserva valor manual. Três regressões exercitam preservação, recálculo e espera do lock (fronteira de banco simulada; sem teste concorrente no banco de produção). `pnpm check`: 20 tarefas, 3,821 s; `/tmp/spark-check-pricing-lock.log`.
- Sync corrigido: cancelamento ligado ao fechamento da resposta; teste HTTP real prova que GET encerrado não cancela SSE ativo. `pnpm check`: 20 tarefas, 3,772 s; `/tmp/spark-check-sync-lifecycle.log`.
- Completar matriz de autorização/API/sync e entradas públicas; SSRF/XSS/arquivos.
- Completar revisão de frontend e performance, rodar orçamento, documentar cobertura e limitações.
- Commitar unidades validadas, enviar commits locais autorizados e conferir SHA remoto.

## Evidências da revisão de código

- Auth: guard valida JWT via JWKS; resolução de usuário nega usuário desativado; CapabilityGuard nega rota sem capacidade declarada.
- Sync: tabela permitida explicitamente, organização e usuário determinados no servidor, visões desconhecidas recusadas; ciclo de vida corrigido e testado em HTTP real.
- Arquivos: controlador exige capacidades distintas de leitura/escrita. Upload agora assina tamanho e tipo; confirmação consulta HEAD no provedor e exige correspondência antes de publicar o arquivo. Teste de assinatura real sem rede e cinco casos de validação no core. Segunda checagem passou: 41 tarefas, 30,467 s; `/tmp/spark-check-upload-2.log`. Conteúdo binário não é inspecionado por antivírus.
- Busca de sinks no frontend: sem `eval`, `new Function` ou HTML bruto nos diretórios de aplicação, UI e blocos. Mensagens do widget limitadas a tamanho/posição; aperfeiçoar validação de origem.
- Fila offline corrigida: registro explícito de POST/PATCH/PUT/DELETE, token renovado somente para mesmo `sub` e `iss`, retenção de 401/408/429/5xx e fechamento do MessagePort. Quatro testes novos; `pnpm check` passou (62 tarefas, 7,031 s; `/tmp/spark-check-offline.log`).
- Link previews corrigido: conexão fixa o IP público validado, rejeita IPv6 mapeado interno e encerra o dispatcher em cada redirecionamento/erro. DNS compartilha o prazo da requisição. Segunda checagem passou: 20 tarefas, 3,644 s; `/tmp/spark-check-ssrf-2.log`.
- Cabeçalho do atendimento reorganizado e catálogo de canais visível, mantendo histórico por pessoa. `e802fea`; `pnpm check`: 20 tarefas, 18,433 s.

- API de edição do negócio agora rejeita valor manual quando há itens, sob o mesmo lock pai. Regra e regressão no core; `pnpm check`: 38 tarefas, 28,84 s; `/tmp/spark-check-manual-amount.log`.

- Orçamento de bundle: `pnpm size` aprovado (19 tarefas, 9,814 s), incluindo build cliente/SSR/service worker; `/tmp/spark-audit-size.log`.
- Próxima revisão delimitada: isolamento do perfil/coleções ao trocar de sessão, MFA e autorização de presença; validação de entradas do widget e fechamento da matriz de endpoints.

- Fronteira de sessão: perfil offline vinculado ao ID do Supabase; troca/logout limpa coleções e reinicia documento para descartar rascunhos React; refresh sem sessão não reutiliza token antigo. Teste com coleção TanStack real e regressões de troca de usuário. Segunda checagem passou: 41 tarefas, 10,551 s; `/tmp/spark-check-session-boundary-2.log`.

- MFA: guard da API no modo JWKS de nuvem consulta o nível exigido pelo Supabase para tokens sem AAL2. Rejeita segundo fator pendente e falha de consulta; requisições simultâneas compartilham somente a consulta em curso. AAL2 assinado não acrescenta chamada remota. Quatro regressões; `pnpm check`: 23 tarefas, 5,574 s; `/tmp/spark-check-mfa.log`. Referência: https://supabase.com/docs/guides/auth/auth-mfa.

## Fechamento de cobertura — estado atual

| Frente | Evidência | Situação |
|---|---|---|
| Atualização e publicação | Pull concluído; remoto confirmado em `afa16ff` antes desta revisão | Correções validadas publicadas; widget e este relatório ainda locais |
| Tipos, lint, testes e build | Checagens completas e por unidade acima; `pnpm size` incluiu cliente, SSR e worker | Check do widget aprovado após corrigir o ambiente do teste |
| Dependências | Zero alertas no checkpoint registrado | Não equivale a garantia sobre vulnerabilidades ainda não publicadas |
| Dinheiro e concorrência | Regressões de parcelamento, preço manual, recorrência e lock | Corrigido no código; sem ensaio concorrente no banco de produção |
| Sessão e MFA | Coleção TanStack real limpa; regressões de perfil, token e MFA | Corrigido e enviado |
| Endpoints | Inventário de 47 controladores; seis sem JWT, todos webhooks ou widget | Exceções autenticadas identificadas abaixo |
| Sync | Whitelist e recortes por org/usuário/capacidade; secrets fora da whitelist | Revisão concluída; cancelamento SSE corrigido |
| Webhooks | Meta usa HMAC SHA-256 do corpo bruto; Telegram e Postmark usam comparação de segredo em tempo constante | Revisão de código concluída; sem disparar entregas reais |
| Segredos | Vault usa AES-256-GCM, IV aleatório de 12 bytes e chave de 32 bytes; tabela de segredos fora do sync | Revisão de código concluída; não houve exportação de credenciais |
| Recursos no frontend | Drag do editor remove listeners/cancela RAF; layout remove atalhos; ficha limpa intervalo; presença limpa timers | Presença de atendimento ainda usa canal público do Supabase e precisa de autorização |
| Interface | Cabeçalho e canais ajustados; contratos de componentes no check | Revisão visual final dos fluxos não concluída |

### Achados restantes

- Widget corrigido: origem e dimensões do embed validadas, conexão desativada recusada, entrada de visitante validada e polling cancelável sem sobreposição. Teste de embed corrigido para leitura local; `pnpm check` passou: 20 tarefas, 12,567 s; `/tmp/spark-check-widget-final.log`.
- O CORS em `apps/api/src/main.ts` permite GET/POST/PATCH/DELETE, mas preferências usam PUT (`UserPreferencesController`). Navegador em origem distinta não consegue realizar esse preflight. Correção pendente.
- Cinco controladores autenticados não usam `CapabilityGuard`: `/me` e preferências são do próprio usuário; sync aplica política compartilhada; resolução de CNPJ e de prévias de link ainda precisam ter a autorização confrontada com a política de leitura correspondente.
- Presença do atendimento: o hook cria canal Supabase sem `private: true` e publica nome/ID escolhidos pelo cliente. A troca para transporte autenticado ainda não foi implementada.

Não houve teste destrutivo, envio real a terceiros, modificação de dados do Postgres de produção, teste de carga ou certificação de segurança. Esses limites não apagam os achados pendentes acima.
