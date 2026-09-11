import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  contactId as contactIdFactory,
  formatPhone,
  email as buildEmail,
  phone as buildPhone,
  type ActivityType,
} from "@spark/core";
import { optimisticActivity } from "@spark/data";
import { Button, DateTimePicker, ErrorText, Field, Input, Label, notify } from "@spark/ui-web";
import type { Route } from "./+types/contact-detail";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getSession } from "../lib/auth.client";
import styles from "./contact-detail.module.css";

export async function clientLoader() {
  await Promise.all([getContactsCollection().preload(), getActivitiesCollection().preload()]);
  return null;
}

const TYPES: { value: ActivityType; label: string }[] = [
  { value: "task", label: "Tarefa" },
  { value: "call", label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "E-mail" },
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default function ContactDetail({ params }: Route.ComponentProps) {
  const collection = getContactsCollection();
  const activitiesCollection = getActivitiesCollection();
  const [selectedType, setSelectedType] = useState<ActivityType>("task");
  const [activityTitle, setActivityTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [activityPending, setActivityPending] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [emailEditError, setEmailEditError] = useState<string | null>(null);
  const [phoneEditError, setPhoneEditError] = useState<string | null>(null);

  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ contacts: collection })
        .where(({ contacts: c }) => eq(c.id, params.contactId))
        .findOne(),
  });

  const { data: activities } = useLiveQuery({
    query: (q) =>
      q
        .from({ activities: activitiesCollection })
        .where(({ activities: a }) => eq(a.contactId, params.contactId))
        .orderBy(({ activities: a }) => a.scheduledAt, "asc"),
  });

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const title = activityTitle.trim();
    if (!title || !scheduledAt || activityPending) return;

    const activity = optimisticActivity(
      {
        contactId: contactIdFactory.from(params.contactId),
        dealId: null,
        type: selectedType,
        title,
        notes: null,
        scheduledAt: new Date(scheduledAt).toISOString(),
      },
      session.orgId,
    );
    setActivityPending(true);
    try {
      const transaction = activitiesCollection.insert(activity);
      await transaction.isPersisted.promise;
      setActivityTitle("");
      setScheduledAt("");
      notify({ title: "Atividade agendada", description: `${title} foi adicionada ao contato.`, tone: "success" });
    } catch {
      notify({ title: "Não foi possível agendar", description: "Tente novamente em instantes.", tone: "error" });
    } finally {
      setActivityPending(false);
    }
  }

  async function toggleCompleted(id: string, title: string, completed: boolean) {
    const transaction = activitiesCollection.update(id, (draft) => {
      draft.completed = completed;
    });
    try {
      await transaction.isPersisted.promise;
      notify({ title: completed ? "Atividade concluída" : "Atividade reaberta", description: title, tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar a atividade", tone: "error" });
    }
  }

  function startEditing() {
    if (!data) return;
    setNameEdit(data.name);
    setEmailEdit(data.email ?? "");
    setPhoneEdit(data.phone ? formatPhone(data.phone) : "");
    setEmailEditError(null);
    setPhoneEditError(null);
    setIsEditing(true);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const trimmedName = nameEdit.trim();
    if (!trimmedName) return;

    setEmailEditError(null);
    setPhoneEditError(null);

    let validEmail = null;
    try {
      validEmail = emailEdit.trim() ? buildEmail(emailEdit) : null;
    } catch {
      setEmailEditError("E-mail inválido.");
      return;
    }

    let validPhone = null;
    try {
      validPhone = phoneEdit.trim() ? buildPhone(phoneEdit) : null;
    } catch {
      setPhoneEditError("Telefone inválido — use DDD + número.");
      return;
    }

    collection.update(data.id, (draft) => {
      draft.name = trimmedName;
      draft.email = validEmail;
      draft.phone = validPhone;
    });
    setIsEditing(false);
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
      <h1 className={styles.titulo}>{data.name}</h1>

      {isEditing ? (
        <form className={styles.camposEdicao} onSubmit={saveEdit}>
          <Field>
            <Label>Nome</Label>
            <Input value={nameEdit} onChange={(event) => setNameEdit(event.target.value)} />
          </Field>
          <Field invalid={!!emailEditError}>
            <Label>E-mail</Label>
            <Input
              value={emailEdit}
              onChange={(event) => {
                setEmailEdit(event.target.value);
                setEmailEditError(null);
              }}
              placeholder="opcional"
            />
            <ErrorText>{emailEditError}</ErrorText>
          </Field>
          <Field invalid={!!phoneEditError}>
            <Label>Telefone</Label>
            <Input
              value={phoneEdit}
              onChange={(event) => {
                setPhoneEdit(event.target.value);
                setPhoneEditError(null);
              }}
              placeholder="opcional"
            />
            <ErrorText>{phoneEditError}</ErrorText>
          </Field>
          <div className={styles.acoesEdicao}>
            <Button type="submit" size="sm" disabled={!nameEdit.trim()}>
              Salvar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.campos}>
          <div className={styles.campo}>
            <span className={styles.rotulo}>E-mail</span>
            <span className={styles.valor}>{data.email ?? "—"}</span>
          </div>
          <div className={styles.campo}>
            <span className={styles.rotulo}>Telefone</span>
            <span className={styles.valor}>{data.phone ? formatPhone(data.phone) : "—"}</span>
          </div>
          <div className={styles.campo}>
            <span className={styles.rotulo}>Pontuação</span>
            <span className={styles.valor}>{data.score}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={startEditing} className={styles.botaoEditar}>
            Editar
          </Button>
        </div>
      )}

      <section className={styles.atividades}>
        <h2 className={styles.subtitulo}>Atividades</h2>

        <ul className={styles.listaAtividades}>
          {activities.map((activity) => (
            <li
              key={activity.id}
              className={[styles.atividade, activity.completed ? styles.atividadeConcluida : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.atividadeInfo}>
                <span className={styles.atividadeTipo}>
                  {TYPES.find((t) => t.value === activity.type)?.label ?? activity.type}
                </span>
                <span className={styles.atividadeTitulo}>{activity.title}</span>
                <span className={styles.atividadeData}>{formatDateTime(activity.scheduledAt)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void toggleCompleted(activity.id, activity.title, !activity.completed)}
              >
                {activity.completed ? "Reabrir" : "Concluir"}
              </Button>
            </li>
          ))}
        </ul>

        <form className={styles.formAtividade} onSubmit={addActivity}>
          <div className={styles.tipoLinha}>
            {TYPES.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selectedType === option.value ? "primary" : "secondary"}
                onClick={() => setSelectedType(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Field>
            <Label>Título</Label>
            <Input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="O que precisa ser feito" />
          </Field>
          <Field>
            <Label>Quando</Label>
            <DateTimePicker label="Data e hora da atividade" mode="datetime" value={scheduledAt} onValueChange={setScheduledAt} placeholder="Selecionar data e hora" />
          </Field>
          <Button type="submit" size="sm" loading={activityPending} disabled={!activityTitle.trim() || !scheduledAt}>
            Adicionar atividade
          </Button>
        </form>
      </section>
    </div>
  );
}
