import { type FormEvent, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { money, sum, formatBRL, type StageId, type DealStatus } from "@spark/core";
import { optimisticPipeline, optimisticStage, optimisticDeal, forInsert, syncedAmount } from "@spark/data";
import { Button, Field, Input, Label } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
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

/** Minimal funnel to start using the board — no settings screen yet. */
async function createDefaultPipeline() {
  const session = getSession();
  if (!session) return;

  const pipeline = optimisticPipeline({ name: "Funil de Vendas", isDefault: true }, session.orgId);
  const pipelineTx = getPipelinesCollection().insert(pipeline);
  // wait for the pipeline to really exist on the server before creating
  // any stage — stages.pipeline_id is a FK; without this, the stage
  // insert can reach the API before the pipeline committed, and fails
  // with "violates foreign key constraint" (found testing in the browser).
  await pipelineTx.isPersisted.promise;

  const names = ["Novo", "Em negociação", "Fechado"];
  for (const [sortOrder, name] of names.entries()) {
    const stage = optimisticStage({ pipelineId: pipeline.id, name, sortOrder }, session.orgId);
    getStagesCollection().insert(stage);
  }
}

export default function Deals() {
  const pipelinesCollection = getPipelinesCollection();
  const stagesCollection = getStagesCollection();
  const dealsCollection = getDealsCollection();

  const { data: pipelines, isLoading: isLoadingPipelines } = useLiveQuery({
    query: (q) => q.from({ pipelines: pipelinesCollection }),
  });
  const { data: allStages } = useLiveQuery({
    query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: s }) => s.sortOrder, "asc"),
  });
  const { data: allDeals } = useLiveQuery({ query: (q) => q.from({ deals: dealsCollection }) });

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [renamingStage, setRenamingStage] = useState<string | null>(null);

  const mainPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const stages = mainPipeline ? allStages.filter((s) => s.pipelineId === mainPipeline.id) : [];
  const deals = mainPipeline ? allDeals.filter((d) => d.pipelineId === mainPipeline.id) : [];

  function addDeal(event: FormEvent<HTMLFormElement>, stageId: StageId) {
    event.preventDefault();
    const session = getSession();
    if (!session || !mainPipeline) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const amountReais = String(formData.get("amount") ?? "0").replace(",", ".");
    if (!name) return;

    const cents = Math.round(Number.parseFloat(amountReais || "0") * 100);
    const deal = optimisticDeal(
      { pipelineId: mainPipeline.id, stageId, name, amount: money(Number.isFinite(cents) ? cents : 0) },
      session.orgId,
    );
    dealsCollection.insert(forInsert(deal));
    event.currentTarget.reset();
  }

  function dropOn(stageId: string) {
    if (dragging) {
      dealsCollection.update(dragging, (draft) => {
        draft.stageId = stageId;
      });
    }
    setDragging(null);
    setDropTarget(null);
  }

  function closeDeal(id: string, status: Extract<DealStatus, "won" | "lost">) {
    dealsCollection.update(id, (draft) => {
      draft.status = status;
    });
  }

  function addStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session || !mainPipeline) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("stageName") ?? "").trim();
    if (!name) return;

    const stage = optimisticStage({ pipelineId: mainPipeline.id, name, sortOrder: stages.length }, session.orgId);
    stagesCollection.insert(stage);
    event.currentTarget.reset();
  }

  function saveStageName(id: string, newName: string) {
    const trimmed = newName.trim();
    if (trimmed) {
      stagesCollection.update(id, (draft) => {
        draft.name = trimmed;
      });
    }
    setRenamingStage(null);
  }

  if (!isLoadingPipelines && !mainPipeline) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Negócios</h1>
        <div className={styles.vazio}>
          <p>Nenhum funil ainda.</p>
          <Button onClick={() => void createDefaultPipeline()}>Criar funil de vendas</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>{mainPipeline?.name ?? "Negócios"}</h1>

      <div className={styles.board}>
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stageId === stage.id);
          const total = sum(stageDeals.map((d) => syncedAmount(d.amount)));

          return (
            <section
              key={stage.id}
              className={[styles.coluna, dropTarget === stage.id ? styles.colunaSobreArraste : ""]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(stage.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropOn(stage.id);
              }}
            >
              <div className={styles.colunaCabecalho}>
                {renamingStage === stage.id ? (
                  <form
                    className={styles.formRenomear}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      saveStageName(stage.id, String(formData.get("name") ?? ""));
                    }}
                  >
                    <Input
                      name="name"
                      size="sm"
                      defaultValue={stage.name}
                      autoFocus
                      onBlur={(event) => saveStageName(stage.id, event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenamingStage(null);
                      }}
                    />
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={styles.colunaNome}
                    onClick={() => setRenamingStage(stage.id)}
                  >
                    {stage.name}
                  </Button>
                )}
                <span className={styles.colunaTotal}>
                  {stageDeals.length} · {formatBRL(total)}
                </span>
              </div>

              <div className={styles.listaCartoes}>
                {stageDeals.map((deal) => {
                  const isOpen = deal.status === "open";
                  return (
                    <article
                      key={deal.id}
                      className={[styles.cartao, dragging === deal.id ? styles.cartaoArrastando : ""]
                        .filter(Boolean)
                        .join(" ")}
                      draggable={isOpen}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(deal.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                    >
                      <span className={styles.cartaoNome}>{deal.name}</span>
                      <span className={styles.cartaoValor}>{formatBRL(syncedAmount(deal.amount))}</span>
                      {isOpen ? (
                        <div className={styles.cartaoAcoes}>
                          <Button variant="ghost" size="sm" onClick={() => closeDeal(deal.id, "won")}>
                            Ganho
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => closeDeal(deal.id, "lost")}>
                            Perdido
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={[
                            styles.cartaoBadge,
                            deal.status === "won" ? styles.cartaoBadgeGanho : styles.cartaoBadgePerdido,
                          ].join(" ")}
                        >
                          {deal.status === "won" ? "Ganho" : "Perdido"}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>

              <form className={styles.formNovo} onSubmit={(event) => addDeal(event, stage.id)}>
                <Field>
                  <Label>Novo negócio</Label>
                  <Input name="name" placeholder="Nome" />
                </Field>
                <div className={styles.formNovoLinha}>
                  <Field className={styles.formNovoValor}>
                    <Label>Valor</Label>
                    <Input name="amount" placeholder="0,00" inputMode="decimal" />
                  </Field>
                  <Button type="submit" size="sm">
                    +
                  </Button>
                </div>
              </form>
            </section>
          );
        })}

        <form className={styles.colunaNova} onSubmit={addStage}>
          <Field>
            <Label>Novo estágio</Label>
            <Input name="stageName" placeholder="Nome do estágio" size="sm" />
          </Field>
          <Button type="submit" size="sm" variant="secondary">
            + Estágio
          </Button>
        </form>
      </div>
    </div>
  );
}
