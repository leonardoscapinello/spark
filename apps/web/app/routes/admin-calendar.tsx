import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { SaveBusinessHourInputSchema, SaveHolidayInputSchema, type BusinessHour, type Holiday } from "@spark/core";
import { optimisticBusinessHour, optimisticHoliday } from "@spark/data";
import { ActionModal, Button, Checkbox, DataTable, Field, Input, Label, PageFrame, PageHeader, Select, Text, Alert, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import { getBusinessHoursCollection, getHolidaysCollection } from "../lib/stage-workflow-collections.client";
import styles from "./settings.module.css";

const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
export async function clientLoader() {
  await requireCapability("pipelines:manage");
  void Promise.allSettled([getBusinessHoursCollection().preload(), getHolidaysCollection().preload()]);
  return null;
}
export default function AdminCalendar() {
  const { data: hours = [], isLoading } = useLiveQuery({ query: q => q.from({ hour: getBusinessHoursCollection() }) });
  const { data: holidays = [] } = useLiveQuery({ query: q => q.from({ holiday: getHolidaysCollection() }).orderBy(({ holiday }) => holiday.startDate, "asc") });
  const [editingHour, setEditingHour] = useState<BusinessHour | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [removing, setRemoving] = useState<Holiday | null>(null);
  const session = getSession();
  const days = DAYS.map((name, weekday) => ({ name, weekday, hour: hours.find(h => h.weekday === weekday) }));
  function editDay(weekday: number) {
    if (!session) return;
    setEditingHour(hours.find(h => h.weekday === weekday) ?? optimisticBusinessHour({ weekday, enabled: weekday > 0 && weekday < 6, startTime: "09:00", endTime: "18:00", breakStartTime: "12:00", breakEndTime: "13:00", timeZone: hours[0]?.timeZone ?? "America/Sao_Paulo" }, session.orgId));
  }
  const columns: TableColumn<(typeof days)[number]>[] = [
    { id: "day", label: "Dia", cell: row => row.name },
    { id: "hours", label: "Expediente", cell: row => !row.hour ? "Não configurado" : !row.hour.enabled ? "Sem expediente" : `${row.hour.startTime} – ${row.hour.endTime}` },
    { id: "break", label: "Intervalo", cell: row => row.hour?.enabled && row.hour.breakStartTime ? `${row.hour.breakStartTime} – ${row.hour.breakEndTime}` : "—" },
  ];
  const holidayColumns: TableColumn<Holiday>[] = [
    { id: "name", label: "Feriado ou exceção", cell: row => row.name },
    { id: "dates", label: "Período", cell: row => `${row.startDate.split("-").reverse().join("/")} até ${row.endDate.split("-").reverse().join("/")}` },
    { id: "kind", label: "Expediente", cell: row => row.kind === "closed" ? "Fechado" : `${row.startTime} – ${row.endTime}` },
    { id: "repeat", label: "Repetição", cell: row => row.repeatsAnnually ? "Anual" : "Uma vez" },
  ];
  return <PageFrame className={styles.page}>
    <PageHeader eyebrow="Organização" title="Calendário útil e feriados" description="Defina quando os prazos de atendimento e das etapas do CRM devem contar." />
    <Text tone="secondary">Fuso horário: {hours[0]?.timeZone ?? "Ainda não configurado"}. Dias sem configuração não contam horas úteis.</Text>
    <DataTable label="Expediente semanal" rows={days} columns={columns} rowKey={row => String(row.weekday)} rowLabel={row => row.name} state={isLoading ? "loading" : "ready"} actions={row => <Button size="sm" variant="ghost" onClick={() => editDay(row.weekday)}>Configurar</Button>} />
    <PageHeader title="Feriados e exceções" actions={<Button onClick={() => { if (session) setEditingHoliday(optimisticHoliday({ name: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), kind: "closed", startTime: null, endTime: null, breakStartTime: null, breakEndTime: null, repeatsAnnually: false }, session.orgId)); }}>Nova exceção</Button>} />
    <DataTable label="Feriados e exceções" rows={holidays} columns={holidayColumns} rowKey={row => row.id} emptyText="Nenhum feriado configurado." actions={row => <><Button size="sm" variant="ghost" onClick={() => setEditingHoliday(row)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => setRemoving(row)}>Remover</Button></>} />
    <Alert tone="info" title="Prazos em horas úteis">Feriados fechados suspendem a contagem. Uma exceção com expediente reduzido substitui os horários daquele dia.</Alert>
    {editingHour && <HourEditor key={editingHour.id} hour={editingHour} exists={hours.some(h => h.id === editingHour.id)} onClose={() => setEditingHour(null)} />}
    {editingHoliday && <HolidayEditor key={editingHoliday.id} holiday={editingHoliday} exists={holidays.some(h => h.id === editingHoliday.id)} onClose={() => setEditingHoliday(null)} />}
    <ActionModal open={Boolean(removing)} onOpenChange={open => { if (!open) setRemoving(null); }} title="Remover exceção" confirmLabel="Remover" onConfirm={async () => { if (removing) await getHolidaysCollection().delete(removing.id).isPersisted.promise; }}><Text>Remover {removing?.name} do calendário?</Text></ActionModal>
  </PageFrame>;
}
function HourEditor({ hour, exists, onClose }: { hour: BusinessHour; exists: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(hour);
  return <ActionModal open onOpenChange={open => { if (!open) onClose(); }} title={DAYS[hour.weekday] ?? "Expediente"} confirmLabel="Salvar expediente" onConfirm={async () => {
    SaveBusinessHourInputSchema.parse(draft);
    const collection = getBusinessHoursCollection();
    if (exists) await collection.update(hour.id, row => { Object.assign(row, draft); }).isPersisted.promise;
    else await collection.insert(draft).isPersisted.promise;
  }}><div className={styles.form}>
    <Checkbox checked={draft.enabled} onCheckedChange={enabled => setDraft({ ...draft, enabled })}>Há expediente neste dia</Checkbox>
    <Field><Label>Fuso horário da organização</Label><Input value={draft.timeZone} placeholder="America/Sao_Paulo" onChange={e => setDraft({ ...draft, timeZone: e.target.value })} /></Field>
    <Text size="pequeno" tone="secondary">Alterar o fuso aplica o mesmo fuso a todos os dias da semana.</Text>
    {draft.enabled && <><Field><Label>Início</Label><Input type="time" value={draft.startTime} onChange={e => setDraft({ ...draft, startTime: e.target.value })} /></Field><Field><Label>Fim</Label><Input type="time" value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })} /></Field><Field><Label>Início do intervalo (opcional)</Label><Input type="time" value={draft.breakStartTime ?? ""} onChange={e => setDraft({ ...draft, breakStartTime: e.target.value || null })} /></Field><Field><Label>Fim do intervalo</Label><Input type="time" value={draft.breakEndTime ?? ""} onChange={e => setDraft({ ...draft, breakEndTime: e.target.value || null })} /></Field></>}
  </div></ActionModal>;
}
function HolidayEditor({ holiday, exists, onClose }: { holiday: Holiday; exists: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(holiday);
  return <ActionModal open onOpenChange={open => { if (!open) onClose(); }} title={exists ? "Editar exceção" : "Nova exceção"} confirmLabel="Salvar exceção" onConfirm={async () => {
    SaveHolidayInputSchema.parse(draft);
    const collection = getHolidaysCollection();
    if (exists) await collection.update(draft.id, row => { Object.assign(row, draft); }).isPersisted.promise;
    else await collection.insert(draft).isPersisted.promise;
  }}><div className={styles.form}>
    <Field><Label>Nome</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
    <Field><Label>Data inicial</Label><Input type="date" value={draft.startDate} onChange={e => setDraft({ ...draft, startDate: e.target.value })} /></Field>
    <Field><Label>Data final</Label><Input type="date" value={draft.endDate} onChange={e => setDraft({ ...draft, endDate: e.target.value })} /></Field>
    <Checkbox checked={draft.repeatsAnnually} onCheckedChange={repeatsAnnually => setDraft({ ...draft, repeatsAnnually })}>Repetir anualmente</Checkbox>
    <Select label="Tipo de exceção" value={draft.kind} options={[{ value: "closed", label: "Fechado" }, { value: "reduced", label: "Expediente reduzido" }]} onValueChange={kind => { if (kind === "closed" || kind === "reduced") setDraft({ ...draft, kind }); }} />
    {draft.kind === "reduced" && <><Field><Label>Início</Label><Input type="time" value={draft.startTime ?? ""} onChange={e => setDraft({ ...draft, startTime: e.target.value || null })} /></Field><Field><Label>Fim</Label><Input type="time" value={draft.endTime ?? ""} onChange={e => setDraft({ ...draft, endTime: e.target.value || null })} /></Field><Field><Label>Início do intervalo</Label><Input type="time" value={draft.breakStartTime ?? ""} onChange={e => setDraft({ ...draft, breakStartTime: e.target.value || null })} /></Field><Field><Label>Fim do intervalo</Label><Input type="time" value={draft.breakEndTime ?? ""} onChange={e => setDraft({ ...draft, breakEndTime: e.target.value || null })} /></Field></>}
  </div></ActionModal>;
}
