import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { contactsControllerMerge } from "@spark/api-client";
import { contactId as id } from "@spark/core";
import { ActionModal, Button, Checkbox, CrmSection, RecordSelect, notify } from "@spark/ui-web";
import { getContactsCollection } from "../lib/contacts-collection.client";
export function MergePerson({ contactId, name }: { contactId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { data: people = [] } = useLiveQuery({ query: (q) => open ? q.from({ people: getContactsCollection() }) : undefined }, [open]);
  const person = people.find((p) => p.id === source);
  return <><Button variant="ghost" onClick={() => { setSource(null); setConfirmed(false); setOpen(true); }}>Mesclar duplicata</Button>
    <ActionModal open={open} onOpenChange={setOpen} title={`Mesclar em ${name}`} confirmLabel="Mesclar pessoas" onConfirm={async () => {
      if (!source || !confirmed) throw new Error("Escolha a duplicata e confirme os registros da mesclagem.");
      await contactsControllerMerge(contactId, { sourceContactId: id.from(source) });
      notify({ title: "Pessoas mescladas", description: `Canais e vínculos agora estão em ${name}.`, tone: "success" });
    }}><CrmSection title="Pessoa que será mantida" description={`${name} permanece como cadastro principal. Dados preenchidos nela prevalecem. O outro cadastro fica arquivado com seus dados originais.`}>
      <RecordSelect label="Pessoa duplicada" value={person ? { value: person.id, label: person.name } : null} options={people.filter((p) => p.id !== contactId && !p.deletedAt).map((p) => ({ value: p.id, label: p.name, description: p.email ?? p.phone ?? "" }))} onValueChange={(v) => { setSource(v?.value ?? null); setConfirmed(false); }} />
      <CrmSection title="O que será reunido" description="E-mails e telefones adicionais, negócios, atividades, notas, conversas, mensagens, etiquetas e histórico. Valores conflitantes continuam preservados no cadastro arquivado.">{null}</CrmSection>
      <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)}>Confirmo que são cadastros da mesma pessoa e quero manter {name}.</Checkbox>
    </CrmSection></ActionModal>
  </>;
}
