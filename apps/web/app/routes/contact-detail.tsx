import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { contactId as contactIdFactory, type ActivityType } from "@spark/core";
import { atividadeOtimista } from "@spark/data";
import { Button, Field, Input, Label } from "@spark/ui-web";
import type { Route } from "./+types/contact-detail";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { obterSessao } from "../lib/auth.client";
import styles from "./contact-detail.module.css";

export async function clientLoader() {
  await Promise.all([getContactsCollection().preload(), getActivitiesCollection().preload()]);
  return null;
}

const TIPOS: { valor: ActivityType; rotulo: string }[] = [
  { valor: "tarefa", rotulo: "Tarefa" },
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "reuniao", rotulo: "Reunião" },
  { valor: "email", rotulo: "E-mail" },
];

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default function ContactDetail({ params }: Route.ComponentProps) {
  const collection = getContactsCollection();
  const activitiesCollection = getActivitiesCollection();
  const [tipoSelecionado, setTipoSelecionado] = useState<ActivityType>("tarefa");

  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ contatos: collection })
        .where(({ contatos: c }) => eq(c.id, params.contactId))
        .findOne(),
  });

  const { data: atividades } = useLiveQuery({
    query: (q) =>
      q
        .from({ activities: activitiesCollection })
        .where(({ activities: a }) => eq(a.contactId, params.contactId))
        .orderBy(({ activities: a }) => a.dataHora, "asc"),
  });

  function adicionarAtividade(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const sessao = obterSessao();
    if (!sessao) return;

    const dados = new FormData(evento.currentTarget);
    const titulo = String(dados.get("titulo") ?? "").trim();
    const dataHoraLocal = String(dados.get("dataHora") ?? "");
    if (!titulo || !dataHoraLocal) return;

    const atividade = atividadeOtimista(
      {
        contactId: contactIdFactory.de(params.contactId),
        dealId: null,
        tipo: tipoSelecionado,
        titulo,
        notas: null,
        dataHora: new Date(dataHoraLocal).toISOString(),
      },
      sessao.orgId,
    );
    activitiesCollection.insert(atividade);
    evento.currentTarget.reset();
  }

  function alternarConcluida(id: string, concluida: boolean) {
    activitiesCollection.update(id, (draft) => {
      draft.concluida = concluida;
    });
  }

  if (!data) {
    return (
      <div className={styles.pagina}>
        <Link to="/" className={styles.voltar}>
          ← Contatos
        </Link>
        <p>Contato não encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <Link to="/" className={styles.voltar}>
        ← Contatos
      </Link>
      <h1 className={styles.titulo}>{data.nome}</h1>

      <div className={styles.campos}>
        <div className={styles.campo}>
          <span className={styles.rotulo}>E-mail</span>
          <span className={styles.valor}>{data.email ?? "—"}</span>
        </div>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Telefone</span>
          <span className={styles.valor}>{data.telefone ?? "—"}</span>
        </div>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Pontuação</span>
          <span className={styles.valor}>{data.score}</span>
        </div>
      </div>

      <section className={styles.atividades}>
        <h2 className={styles.subtitulo}>Atividades</h2>

        <ul className={styles.listaAtividades}>
          {atividades.map((atividade) => (
            <li
              key={atividade.id}
              className={[styles.atividade, atividade.concluida ? styles.atividadeConcluida : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.atividadeInfo}>
                <span className={styles.atividadeTipo}>
                  {TIPOS.find((t) => t.valor === atividade.tipo)?.rotulo ?? atividade.tipo}
                </span>
                <span className={styles.atividadeTitulo}>{atividade.titulo}</span>
                <span className={styles.atividadeData}>{formatarDataHora(atividade.dataHora)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alternarConcluida(atividade.id, !atividade.concluida)}
              >
                {atividade.concluida ? "Reabrir" : "Concluir"}
              </Button>
            </li>
          ))}
        </ul>

        <form className={styles.formAtividade} onSubmit={adicionarAtividade}>
          <div className={styles.tipoLinha}>
            {TIPOS.map((opcao) => (
              <Button
                key={opcao.valor}
                type="button"
                size="sm"
                variant={tipoSelecionado === opcao.valor ? "primary" : "secondary"}
                onClick={() => setTipoSelecionado(opcao.valor)}
              >
                {opcao.rotulo}
              </Button>
            ))}
          </div>
          <Field>
            <Label>Título</Label>
            <Input name="titulo" placeholder="O que precisa ser feito" />
          </Field>
          <Field>
            <Label>Quando</Label>
            <Input name="dataHora" type="datetime-local" />
          </Field>
          <Button type="submit" size="sm">
            Adicionar atividade
          </Button>
        </form>
      </section>
    </div>
  );
}
