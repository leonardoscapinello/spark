import { Controller, Get, NotFoundException, Param, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { SupabaseJwtGuard, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { SHAPE_TABLES, isTabelaSincronizavel } from "../application/shape-tables.js";

/**
 * Proxy de autorização pro Electric (docs/adr/0018, docs/adr/0026). O
 * cliente NUNCA fala com o Electric direto — só com isto. É aqui, e só
 * aqui, que a cláusula WHERE do shape é decidida: o cliente escolhe a
 * tabela, o SERVIDOR escolhe o filtro. Sem isto, "shape mal escrito" vira
 * vazamento de dado entre organizações (o risco de segurança nº 1 desta
 * arquitetura, registrado no roadmap).
 *
 * @ApiExcludeEndpoint — não entra no openapi.json/cliente gerado (ADR-0004).
 * Isto não é um endpoint de negócio com contrato Zod; é infraestrutura de
 * sync que packages/data fala via ShapeStream, não via api-client.
 */
@Controller("v1/shapes")
export class ShapesController {
  constructor(
    private readonly config: ConfigService,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Get(":tabela")
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxy(
    @Param("tabela") tabela: string,
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!isTabelaSincronizavel(tabela)) {
      throw new NotFoundException(`Tabela "${tabela}" não é sincronizável.`);
    }

    const usuario = await this.getCurrentUser.execute(claims.sub);
    const request = reply.request as FastifyRequest;

    const electricBase = this.config.get<string>("ELECTRIC_URL") ?? "http://localhost:3010";
    const upstream = new URL("/v1/shape", electricBase);

    // só os parâmetros de protocolo do Electric passam do cliente — nunca
    // "table" nem "where", que o servidor decide sozinho logo abaixo.
    const query = request.query as Record<string, string>;
    for (const chave of ELECTRIC_PROTOCOL_QUERY_PARAMS) {
      if (query[chave] !== undefined) upstream.searchParams.set(chave, query[chave]);
    }

    // noUncheckedIndexedAccess (tsconfig.base.json) exige isto mesmo já
    // tendo passado por isTabelaSincronizavel — o guard estreita a CHAVE,
    // não garante o VALOR presente aos olhos do compilador.
    const configuracaoTabela = SHAPE_TABLES[tabela];
    if (!configuracaoTabela) {
      throw new NotFoundException(`Tabela "${tabela}" não é sincronizável.`);
    }
    const { coluna } = configuracaoTabela;
    upstream.searchParams.set("table", tabela);
    upstream.searchParams.set("where", `"${coluna}" = $1`);
    upstream.searchParams.set("params[1]", usuario.orgId);

    const resposta = await fetch(upstream);

    reply.status(resposta.status);
    for (const [nome, valor] of resposta.headers) {
      // content-encoding/length descrevem o corpo ORIGINAL comprimido do
      // Electric; ao repassar via stream, o Fastify recalcula — cabeçalho
      // velho aqui faz o cliente truncar ou travar o parse.
      if (nome === "content-encoding" || nome === "content-length") continue;
      reply.header(nome, valor);
    }

    if (!resposta.body) {
      await reply.send();
      return;
    }
    await reply.send(Readable.fromWeb(resposta.body as never));
  }
}
