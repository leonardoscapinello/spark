// Um pool de conexão é infraestrutura compartilhada, não algo que cada classe
// cria para si. Esta regra existe porque o contrário aconteceu e derrubou o
// sistema: 38 classes de repositório chamavam `createDbClient` no construtor,
// cada chamada abria um pool novo, e o padrão de dez conexões por pool virou
// até 380 conexões de um processo só — contra as 43 que o banco tinha livres.
//
// Ninguém escreveu «380» em lugar nenhum. O número emergiu da multiplicação, e
// nenhuma regra, teste ou tipo reprovava. Por isso a regra é estrutural: chamar
// `postgres()` direto fora de `packages/db` fica proibido, e é ali que o pool
// é criado uma vez e memorizado por endereço.
const PERMITIDO = ["packages/db/src/client.ts"];

/**
 * Teste de integração abre a SUA PRÓPRIA conexão administrativa, fora do
 * pool da aplicação — para preparar dado antes do teste e limpar depois, com
 * `max: 1` e `.end()` explícito no fim. Não é o padrão que causou o
 * esgotamento (uma classe de produção abrindo pool no construtor); é uma
 * conexão de vida curta, de teste, isolada da API.
 */
function ehArquivoDeTeste(arquivo) {
  return /\.(test|spec)\.[jt]sx?$/.test(arquivo) || arquivo.includes("/test/");
}

export const oneConnectionPool = {
  meta: {
    type: "problem",
    docs: { description: "O pool de conexão do Postgres é criado num lugar só." },
    schema: [],
    messages: {
      direto: "Não abra um pool aqui. `postgres()` só em packages/db/src/client.ts, que cria um por endereço e o compartilha. Um pool por classe já esgotou as conexões do banco uma vez.",
    },
  },
  create(context) {
    const arquivo = context.filename.replace(/\\/g, "/");
    if (PERMITIDO.some((permitido) => arquivo.endsWith(permitido)) || ehArquivoDeTeste(arquivo)) return {};

    /** Nome local do import default de `postgres` neste arquivo. */
    let importado = null;

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "postgres") return;
        for (const especificador of node.specifiers) {
          if (especificador.type === "ImportDefaultSpecifier") importado = especificador.local.name;
        }
      },
      CallExpression(node) {
        if (importado === null) return;
        if (node.callee.type !== "Identifier" || node.callee.name !== importado) return;
        context.report({ node, messageId: "direto" });
      },
    };
  },
};
