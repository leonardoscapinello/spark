import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { optimisticContact } from "@spark/data";
import {
  contactMatches,
  email as buildEmail,
  phone as buildPhone,
  formatPhone,
} from "@spark/core";
import { Button, ErrorText, Field, Input, Label } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import styles from "./contacts.module.css";

/**
 * Syncs the collection before the first client-side paint — after that,
 * every read (here and in contact-detail) is local (docs/adr/0018,
 * docs/adr/0026). Not a (server) loader: ShapeStream only exists in the browser.
 */
export async function clientLoader() {
  await getContactsCollection().preload();
  return null;
}

export default function Contacts() {
  const collection = getContactsCollection();
  const { data: contacts, isLoading } = useLiveQuery({
    query: (q) => q.from({ contacts: collection }).orderBy(({ contacts: c }) => c.createdAt, "desc"),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const filteredContacts = contacts.filter((contact) => contactMatches(contact, search));

  function addContact(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const session = getSession();
    if (!session) return;

    setEmailError(null);
    setPhoneError(null);

    let validEmail = null;
    try {
      validEmail = email.trim() ? buildEmail(email) : null;
    } catch {
      setEmailError("E-mail inválido.");
      return;
    }

    let validPhone = null;
    try {
      validPhone = phone.trim() ? buildPhone(phone) : null;
    } catch {
      setPhoneError("Telefone inválido — use DDD + número.");
      return;
    }

    collection.insert(
      optimisticContact({ name: trimmedName, email: validEmail, phone: validPhone }, session.orgId),
    );
    setName("");
    setEmail("");
    setPhone("");
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Contatos</h1>

      <form className={styles.formNovo} onSubmit={addContact}>
        <Field>
          <Label>Novo contato</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do contato"
          />
        </Field>
        <Field invalid={!!emailError}>
          <Label>E-mail</Label>
          <Input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
            }}
            placeholder="opcional"
          />
          <ErrorText>{emailError}</ErrorText>
        </Field>
        <Field invalid={!!phoneError}>
          <Label>Telefone</Label>
          <Input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setPhoneError(null);
            }}
            placeholder="opcional"
          />
          <ErrorText>{phoneError}</ErrorText>
        </Field>
        <Button type="submit" disabled={!name.trim()}>
          Adicionar
        </Button>
      </form>

      {contacts.length > 0 && (
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
        />
      )}

      {isLoading && contacts.length === 0 ? (
        <p className={styles.vazio}>Sincronizando…</p>
      ) : contacts.length === 0 ? (
        <p className={styles.vazio}>Nenhum contato ainda.</p>
      ) : filteredContacts.length === 0 ? (
        <p className={styles.vazio}>Nenhum contato bate com "{search}".</p>
      ) : (
        <ul className={styles.lista}>
          {filteredContacts.map((contact) => (
            <li key={contact.id}>
              <Link to={`/contacts/${contact.id}`} className={styles.item}>
                <div className={styles.itemNome}>{contact.name}</div>
                {(contact.email ?? contact.phone) && (
                  <div className={styles.itemDetalhe}>
                    {contact.email ?? (contact.phone ? formatPhone(contact.phone) : "")}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
