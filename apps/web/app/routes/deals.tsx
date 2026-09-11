import { type FormEvent, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { money, sum, formatBRL, type StageId, type DealStatus } from "@spark/core";
import { pipelineOtimista, estagioOtimista, negocioOtimista, paraInsercao, valorSincronizado } from "@spark/data";
import { Button, Field, Input, Label } from "@spark/ui-web";
import { obterSessao } from "../lib/auth.client";
import { getPipelinesCollection, getStagesCollection, getDealsCollection } from "../lib/deals-collections.client";
import styles from "./deals.module.css";

export async function clientLoader() {
  await Promise.all([
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getDealsCollection().preload(),
  ]);
  return null;
}

/** Funil mínimo pra começar a usar o board — sem tela de configuração ainda. */
async function criarFunilPadrao() {
  const sessao = obterSessao();
  if (!sessao) return;

  const pipeline = pipelineOtimista({ nome: "Funil de Vendas", padrao: true }, sessao.orgId);
  const txPipeline = getPipelinesCollection().insert(pipeline);
  // esperar o pipeline existir de verdade no servidor antes de criar
  // estágio nenhum — stages.pipeline_id é FK; sem isto, o insert do
  // estágio pode chegar na API antes do pipeline ter comitado, e cai em
  // "violates foreign key constraint" (achado testando no navegador).
  await txPipeline.isPersisted.promise;

  const nomes = ["Novo", "Em negociação", "Fechado"];
  for (const [ordem, nome] of nomes.entries()) {
    const estagio = estagioOtimista({ pipelineId: pipeline.id, nome, ordem }, sessao.orgId);
    getStagesCollection().insert(estagio);
  }
}

export default function Deals() {
  const pipelinesCollection = getPipelinesCollection();
  const stagesCollection = getStagesCollection();
  const dealsCollection = getDealsCollection();

  const { data: pipelines, isLoading: carregandoPipelines } = useLiveQuery({
    query: (q) => q.from({ pipelines: pipelinesCollection }),
  });
  const { data: todosEstagios } = useLiveQuery({
    query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: s }) => s.ordem, "asc"),
  });
  const { data: todosNegocios } = useLiveQuery({ query: (q) => q.from({ deals: dealsCollection }) });

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);

  const pipelinePrincipal = pipelines.find((p) => p.padrao) ?? pipelines[0];
  const estagios = pipelinePrincipal ? todosEstagios.filter((e) => e.pipelineId === pipelinePrincipal.id) : [];
  const negocios = pipelinePrincipal ? todosNegocios.filter((d) => d.pipelineId === pipelinePrincipal.id) : [];

  function adicionarNegocio(evento: FormEvent<HTMLFormElement>, stageId: StageId) {
    evento.preventDefault();
    const sessao = obterSessao();
    if (!sessao || !pipelinePrincipal) return;

    const dados = new FormData(evento.currentTarget);
    const nome = String(dados.get("nome") ?? "").trim();
    const valorReais = String(dados.get("valor") ?? "0").replace(",", ".");
    if (!nome) return;

    const centavos = Math.round(Number.parseFloat(valorReais || "0") * 100);
    const negocio = negocioOtimista(
      { pipelineId: pipelinePrincipal.id, stageId, nome, valor: money(Number.isFinite(centavos) ? centavos : 0) },
      sessao.orgId,
    );
    dealsCollection.insert(paraInsercao(negocio));
    evento.currentTarget.reset();
  }

  function soltarEm(stageId: string) {
    if (arrastando) {
      dealsCollection.update(arrastando, (draft) => {
        draft.stageId = stageId;
      });
    }
    setArrastando(null);
    setColunaAlvo(null);
  }

  function fecharNegocio(id: string, status: Extract<DealStatus, "ganho" | "perdido">) {
    dealsCollection.update(id, (draft) => {
      draft.status = status;
    });
  }

  function adicionarEstagio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const sessao = obterSessao();
    if (!sessao || !pipelinePrincipal) return;

    const dados = new FormData(evento.currentTarget);
    const nome = String(dados.get("nomeEstagio") ?? "").trim();
    if (!nome) return;

    const estagio = estagioOtimista({ pipelineId: pipelinePrincipal.id, nome, ordem: estagios.length }, sessao.orgId);
    stagesCollection.insert(estagio);
    evento.currentTarget.reset();
  }

  if (!carregandoPipelines && !pipelinePrincipal) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Negócios</h1>
        <div className={styles.vazio}>
          <p>Nenhum funil ainda.</p>
          <Button onClick={() => void criarFunilPadrao()}>Criar funil de vendas</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{pipelinePrincipal?.nome ?? "Negócios"}</h1>

      <div className={styles.board}>
        {estagios.map((estagio) => {
          const negociosDoEstagio = negocios.filter((n) => n.stageId === estagio.id);
          const total = sum(negociosDoEstagio.map((n) => valorSincronizado(n.valor)));

          return (
            <section
              key={estagio.id}
              className={[styles.coluna, colunaAlvo === estagio.id ? styles.colunaSobreArraste : ""]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(evento) => {
                evento.preventDefault();
                setColunaAlvo(estagio.id);
              }}
              onDrop={(evento) => {
                evento.preventDefault();
                soltarEm(estagio.id);
              }}
            >
              <div className={styles.colunaCabecalho}>
                <span className={styles.colunaNome}>{estagio.nome}</span>
                <span className={styles.colunaTotal}>
                  {negociosDoEstagio.length} · {formatBRL(total)}
                </span>
              </div>

              <div className={styles.listaCartoes}>
                {negociosDoEstagio.map((negocio) => {
                  const aberto = negocio.status === "aberto";
                  return (
                    <article
                      key={negocio.id}
                      className={[styles.cartao, arrastando === negocio.id ? styles.cartaoArrastando : ""]
                        .filter(Boolean)
                        .join(" ")}
                      draggable={aberto}
                      onDragStart={(evento) => {
                        evento.dataTransfer.effectAllowed = "move";
                        setArrastando(negocio.id);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setColunaAlvo(null);
                      }}
                    >
                      <span className={styles.cartaoNome}>{negocio.nome}</span>
                      <span className={styles.cartaoValor}>{formatBRL(valorSincronizado(negocio.valor))}</span>
                      {aberto ? (
                        <div className={styles.cartaoAcoes}>
                          <Button variant="ghost" size="sm" onClick={() => fecharNegocio(negocio.id, "ganho")}>
                            Ganho
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => fecharNegocio(negocio.id, "perdido")}>
                            Perdido
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={[
                            styles.cartaoBadge,
                            negocio.status === "ganho" ? styles.cartaoBadgeGanho : styles.cartaoBadgePerdido,
                          ].join(" ")}
                        >
                          {negocio.status === "ganho" ? "Ganho" : "Perdido"}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>

              <form className={styles.formNovo} onSubmit={(evento) => adicionarNegocio(evento, estagio.id)}>
                <Field>
                  <Label>Novo negócio</Label>
                  <Input name="nome" placeholder="Nome" />
                </Field>
                <div className={styles.formNovoLinha}>
                  <Field className={styles.formNovoValor}>
                    <Label>Valor</Label>
                    <Input name="valor" placeholder="0,00" inputMode="decimal" />
                  </Field>
                  <Button type="submit" size="sm">
                    +
                  </Button>
                </div>
              </form>
            </section>
          );
        })}

        <form className={styles.colunaNova} onSubmit={adicionarEstagio}>
          <Field>
            <Label>Novo estágio</Label>
            <Input name="nomeEstagio" placeholder="Nome do estágio" size="sm" />
          </Field>
          <Button type="submit" size="sm" variant="secondary">
            + Estágio
          </Button>
        </form>
      </div>
    </div>
  );
}
