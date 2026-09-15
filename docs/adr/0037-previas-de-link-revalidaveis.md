# ADR-0037 — Prévias de link revalidáveis no Postgres

**Status:** aceito

## Contexto

Links aparecem em mensagens, empresas e campos personalizados. Buscar título,
descrição e imagem no site de origem a cada hover torna a interface lenta,
repete tráfego externo e deixa o resultado variar entre telas. Guardar uma vez
para sempre, por outro lado, eterniza conteúdo desatualizado.

## Decisão

Cada organização mantém uma linha por URL normalizada em `link_previews`.
Título, descrição, imagem, site, validadores HTTP e datas de busca e expiração
ficam em colunas tipadas. A leitura da interface vem da coleção local
sincronizada; hover ou foco apenas solicita resolução quando a linha não existe
ou venceu.

O servidor usa stale-while-revalidate: uma prévia vencida continua visível
durante a atualização. `ETag` e `Last-Modified` evitam baixar novamente uma
página inalterada. O TTL padrão é 24 horas, respeitando o cache do site entre
15 minutos e 7 dias. Falhas usam espera exponencial entre 15 minutos e 24
horas. URLs e todos os redirecionamentos passam por bloqueio de endereços
locais, privados e reservados antes da busca.

## Consequências

- Hover comum não depende da rede.
- Uma URL compartilhada em vários registros reutiliza a mesma prévia.
- Conteúdo muda sem apagar o cache manualmente.
- A imagem continua sendo servida pela origem e aproveita o cache HTTP do
  navegador; copiar bytes para o storage só entra se métricas mostrarem essa
  necessidade.
