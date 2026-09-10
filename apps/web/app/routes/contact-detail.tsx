import { Link } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { Route } from "./+types/contact-detail";
import { getContactsCollection } from "../lib/contacts-collection.client";
import styles from "./contact-detail.module.css";

export async function clientLoader() {
  await getContactsCollection().preload();
  return null;
}

export default function ContactDetail({ params }: Route.ComponentProps) {
  const collection = getContactsCollection();
  const { data } = useLiveQuery({
    query: (q) =>
      q
        .from({ contatos: collection })
        .where(({ contatos: c }) => eq(c.id, params.contactId))
        .findOne(),
  });

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
    </div>
  );
}
