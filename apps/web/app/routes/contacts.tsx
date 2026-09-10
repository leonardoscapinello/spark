import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { contatoOtimista } from "@spark/data";
import { Button, Field, Input, Label } from "@spark/ui-web";
import { obterSessao } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import styles from "./contacts.module.css";

/**
 * Sincroniza a coleção antes do primeiro paint client-side — depois disso
 * toda leitura (aqui e em contact-detail) é local (docs/adr/0018,
 * docs/adr/0026). Não é loader (server): ShapeStream só existe no
 * navegador.
 */
export async function clientLoader() {
  await getContactsCollection().preload();
  return null;
}

export default function Contacts() {
  const collection = getContactsCollection();
  const { data: contatos, isLoading } = useLiveQuery({
    query: (q) => q.from({ contatos: collection }).orderBy(({ contatos: c }) => c.criadoEm, "desc"),
  });

  const [nome, setNome] = useState("");

  function adicionar(evento: FormEvent) {
    evento.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    const sessao = obterSessao();
    if (!sessao) return;

    collection.insert(contatoOtimista({ nome: nomeLimpo }, sessao.orgId));
    setNome("");
  }

  return (
    <div className={styles.pagina}>
      <h1 className={styles.titulo}>Contatos</h1>

      <form className={styles.formNovo} onSubmit={adicionar}>
        <Field>
          <Label>Novo contato</Label>
          <Input
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Nome do contato"
          />
        </Field>
        <Button type="submit" disabled={!nome.trim()}>
          Adicionar
        </Button>
      </form>

      {isLoading && contatos.length === 0 ? (
        <p className={styles.vazio}>Sincronizando…</p>
      ) : contatos.length === 0 ? (
        <p className={styles.vazio}>Nenhum contato ainda.</p>
      ) : (
        <ul className={styles.lista}>
          {contatos.map((contato) => (
            <li key={contato.id}>
              <Link to={`/contacts/${contato.id}`} className={styles.item}>
                <div className={styles.itemNome}>{contato.nome}</div>
                {(contato.email ?? contato.telefone) && (
                  <div className={styles.itemDetalhe}>{contato.email ?? contato.telefone}</div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
