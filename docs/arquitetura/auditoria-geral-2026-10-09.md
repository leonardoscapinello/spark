# Auditoria geral — 9 de outubro de 2026

Status: concluída no escopo abaixo, com correções verificadas e preparadas para publicação. Não equivale a certificação de ausência de vulnerabilidades.

## Escopo e resultado

| Frente | Resultado |
|---|---|
| Atualização | `git pull --ff-only` concluído, preservando trabalho local; os 86 commits locais anteriores foram enviados. |
| Construção e dependências | Tipos, lint, testes, builds cliente/SSR/worker e orçamento de bundle aprovados. Auditoria de produção passou de 22 alertas para zero em 508 dependências no checkpoint registrado. |
| Autorização e isolamento | Revisados JWT/JWKS, MFA, capacidades, organização, sync, endpoints públicos e autenticados. Consultas de CNPJ e links agora aplicam a mesma política de acesso do sync. |
| Dinheiro e concorrência | Corrigidos parcelamento, preservação do valor manual, recálculo e serialização de alterações em itens, ajustes, cupons e condições. |
| Recursos e sessão | Corrigidos encerramento SSE, troca de usuário, perfil offline, limpeza de coleções, polling do widget e presença do atendimento. |
| Interface e campos | Cabeçalho separa nome, assunto, ferramentas e canais; histórico permanece por pessoa. Revisados contratos, código de campos e limpeza de listeners/timers. |
| Publicação | Unidades de código commitadas após check aprovado; relatório consolidado neste documento. |

## Correções entregues

- **Parcelamento:** rejeição de quantidade fracionária, NaN e infinita; busca de opções continua quando o início dos juros pode tornar uma parcela posterior válida.
- **Cupons e precificação:** lock antes de contar usos; alterações dependentes adquirem lock do negócio antes de recalcular. Editar condições sem itens preserva o valor manual; valor manual é recusado quando há itens.
- **Dependências:** atualizações de Fastify, adaptador Nest, Nodemailer e correções transitivas. Protótipos externos não versionados foram excluídos do lint por caminho específico, sem apagar os arquivos.
- **Fila offline:** registro dos métodos POST/PATCH/PUT/DELETE; renovação de token somente para o mesmo emissor e usuário; retenção dos erros temporários; fechamento do MessagePort. Digitação efêmera fica fora da fila.
- **Sync:** cancelamento associado ao fechamento da resposta, evitando cancelar SSE quando o GET termina.
- **Prévias de links:** IP público validado fixado na conexão; rejeição de endereços internos, inclusive IPv6 mapeado; DNS dentro do prazo e dispatcher encerrado em cada redirecionamento/erro.
- **Arquivos:** tamanho e tipo assinados no upload; HEAD do objeto validado antes de publicar o arquivo como pronto.
- **Sessão:** perfil offline vinculado ao usuário autenticado; troca/logout limpa coleções e reinicia o documento para descartar rascunhos; ausência de sessão não reutiliza token antigo; resposta atrasada não restaura perfil anterior.
- **MFA:** no modo JWKS de nuvem, tokens sem AAL2 consultam o nível exigido pelo Supabase; segundo fator pendente e falhas de consulta são recusados. Tokens AAL2 assinados não acrescentam chamada remota. Referência: https://supabase.com/docs/guides/auth/auth-mfa.
- **Widget:** origem do postMessage e dimensões validadas; conexão desativada recusada; visitante validado; polling cancelável sem sobreposição e restauração dos estilos ao desmontar.
- **API:** CORS permite PUT de preferências. CNPJ e links usam `canReadSyncResource` via guard, preservando negação por padrão para rotas sem declaração.
- **Presença:** atendimento sai do canal público e usa API autenticada, organização verificada e identidade determinada pelo servidor. CRM e inbox compartilham transporte Valkey e ciclo de vida SSE. Digitação mantém expiração, throttle, cancelamento e independência do envio. ADR-0047 registra a extensão.
- **Atendimento:** nome e assunto separados, menu de ferramentas com ícone, catálogo dos seis canais visível inclusive sem conversa prévia; histórico continua agrupado por pessoa.

## Matriz de segurança e recursos revisados

- Inventário inicial: 47 controladores; os seis sem JWT são cinco webhooks e o widget público. O controlador de presença adicionado exige JWT e capacidades.
- `/me` e preferências operam sobre o próprio usuário. Sync aplica política compartilhada de capacidades e recortes por organização/usuário; recursos desconhecidos são recusados.
- Webhooks Meta validam HMAC SHA-256 do corpo bruto; Telegram e Postmark comparam segredos em tempo constante.
- Vault usa AES-256-GCM, IV aleatório de 12 bytes e chave de 32 bytes. Segredos de integração não fazem parte da whitelist do sync.
- Não foram encontrados sinks de HTML bruto, `eval` ou `new Function` nos diretórios de aplicação, UI e blocos. O teste do embed executa o script em VM isolada.
- Drag do editor remove listeners e cancela RAF; layout remove atalhos; ficha limpa intervalo. Presença libera lease/listener/timers, expira com o token e encerra leitores lentos sem acumular buffer indefinidamente.

## Evidências de validação

Cada unidade teve check aprovado antes do commit. Não houve repetição de uma verificação já aprovada sem mudança relacionada.

| Unidade | Resultado | Log local |
|---|---|---|
| Verificação completa inicial | 72 tarefas; 59,087 s | `/tmp/spark-audit-full-20261009-2.log` |
| Compatibilidade das dependências | 72 tarefas; 36,639 s | `/tmp/spark-check-dependencies.log` |
| Auditoria de dependências | Zero alertas de produção no checkpoint | `/tmp/spark-security-final.json` |
| Fila offline | 62 tarefas; 7,031 s | `/tmp/spark-check-offline.log` |
| Cancelamento do sync | 20 tarefas; 3,772 s | `/tmp/spark-check-sync-lifecycle.log` |
| Cabeçalho do atendimento | 20 tarefas; 18,433 s | `/tmp/spark-inbox-header-check.log` |
| SSRF | 20 tarefas; 3,644 s | `/tmp/spark-check-ssrf-2.log` |
| Locks de precificação | 20 tarefas; 3,821 s | `/tmp/spark-check-pricing-lock.log` |
| Valor manual | 38 tarefas; 28,84 s | `/tmp/spark-check-manual-amount.log` |
| Integridade de upload | 41 tarefas; 30,467 s | `/tmp/spark-check-upload-2.log` |
| Fronteira de sessão | 41 tarefas; 10,551 s | `/tmp/spark-check-session-boundary-2.log` |
| MFA | 23 tarefas; 5,574 s | `/tmp/spark-check-mfa.log` |
| Widget | 20 tarefas; 12,567 s | `/tmp/spark-check-widget-final.log` |
| Política de recursos e CORS | 20 tarefas; 6,989 s | `/tmp/spark-check-resource-auth-2.log` |
| Presença autenticada | 23 tarefas; 17,683 s | `/tmp/spark-check-presence.log` |
| Exclusão de digitação da fila | 23 tarefas; 8,646 s | `/tmp/spark-check-ephemeral-queue.log` |
| Bundle após transporte de presença | 19 tarefas; 8,713 s | `/tmp/spark-audit-size-final.log` |

As regressões incluem streams HTTP reais, frames SSE fragmentados, isolamento por organização na fronteira do controlador, identidade de digitação determinada no servidor, coleção TanStack real, assinatura de upload sem rede e política de autorização compartilhada. O check de presença registrou 49 testes de API, 16 de dados, 36 web e 160 de UI aprovados; tarefas de UI sem alterações usaram cache.

## Limites da evidência

- Não houve alteração de dados do Postgres de produção, ensaio concorrente nesse banco nem teste de carga. Testes de locks usam fronteira de banco simulada.
- Não houve envio real de mensagens a terceiros nem entrega real de webhooks. Transporte Valkey entre réplicas não foi exercitado contra infraestrutura de produção.
- Arquivos têm integridade de metadados verificada; esta auditoria não adicionou inspeção antivírus de conteúdo binário.
- Interface foi revisada por código, contratos e testes de componentes. Não houve nova sessão autenticada para inspeção visual completa em todos os tamanhos de tela; aprovação dos checks não é certificação visual.
- Os logs em `/tmp` são evidência local temporária. As correções e testes de regressão estão versionados. Os materiais não versionados em `packages/tokens/fonts/brockmann/Claude outputs/` foram preservados.
- Nenhum achado confirmado desta matriz ficou sem correção. Esses limites descrevem o que foi efetivamente verificado, sem ampliar indefinidamente a auditoria.
