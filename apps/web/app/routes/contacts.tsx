import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { contatoOtimista } from "@spark/data";
import {
  contatoCorresponde,
  email as construirEmail,
  telefone as construirTelefone,
  formatTelefone,
} from "@spark/core";
import { Button, ErrorText, Field, Input, Label } from "@spark/ui-web";
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
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroTelefone, setErroTelefone] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const contatosFiltrados = contatos.filter((contato) => contatoCorresponde(contato, busca));

  function adicionar(evento: FormEvent) {
    evento.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    const sessao = obterSessao();
    if (!sessao) return;

    setErroEmail(null);
    setErroTelefone(null);

    let emailValido = null;
    try {
      emailValido = email.trim() ? construirEmail(email) : null;
    } catch {
      setErroEmail("E-mail inválido.");
      return;
    }

    let telefoneValido = null;
    try {
      telefoneValido = telefone.trim() ? construirTelefone(telefone) : null;
    } catch {
      setErroTelefone("Telefone inválido — use DDD + número.");
      return;
    }

    collection.insert(
      contatoOtimista({ nome: nomeLimpo, email: emailValido, telefone: telefoneValido }, sessao.orgId),
    );
    setNome("");
    setEmail("");
    setTelefone("");
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
        <Field invalid={!!erroEmail}>
          <Label>E-mail</Label>
          <Input
            value={email}
            onChange={(evento) => {
              setEmail(evento.target.value);
              setErroEmail(null);
            }}
            placeholder="opcional"
          />
          <ErrorText>{erroEmail}</ErrorText>
        </Field>
        <Field invalid={!!erroTelefone}>
          <Label>Telefone</Label>
          <Input
            value={telefone}
            onChange={(evento) => {
              setTelefone(evento.target.value);
              setErroTelefone(null);
            }}
            placeholder="opcional"
          />
          <ErrorText>{erroTelefone}</ErrorText>
        </Field>
        <Button type="submit" disabled={!nome.trim()}>
          Adicionar
        </Button>
      </form>

      {contatos.length > 0 && (
        <Input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
        />
      )}

      {isLoading && contatos.length === 0 ? (
        <p className={styles.vazio}>Sincronizando…</p>
      ) : contatos.length === 0 ? (
        <p className={styles.vazio}>Nenhum contato ainda.</p>
      ) : contatosFiltrados.length === 0 ? (
        <p className={styles.vazio}>Nenhum contato bate com "{busca}".</p>
      ) : (
        <ul className={styles.lista}>
          {contatosFiltrados.map((contato) => (
            <li key={contato.id}>
              <Link to={`/contacts/${contato.id}`} className={styles.item}>
                <div className={styles.itemNome}>{contato.nome}</div>
                {(contato.email ?? contato.telefone) && (
                  <div className={styles.itemDetalhe}>
                    {contato.email ?? (contato.telefone ? formatTelefone(contato.telefone) : "")}
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
