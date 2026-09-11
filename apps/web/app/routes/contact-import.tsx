import { useMemo, useState, type ChangeEvent } from "react";
import { Link, redirect, useNavigate } from "react-router";
import type { Route } from "./+types/contact-import";
import { contactsControllerImportCsv } from "@spark/api-client";
import { contactId as contactIdFactory, parseContactCsv, type ParsedContactCsvRow } from "@spark/core";
import { Button, DataTable, Field, Input, Label, PageHeader, notify, type TableColumn } from "@spark/ui-web";
import { requireCapability } from "../lib/route-access.client";
import styles from "./contact-import.module.css";

const MAX_CONTACTS = 2000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function clientLoader() {
  const session = await requireCapability("contacts:read");
  if (!session.capabilities.includes("contacts:write")) throw redirect("/");
  return null;
}

export default function ContactImport(_props: Route.ComponentProps) {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedContactCsvRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = rows.length - validRows.length;
  const previewRows = rows.slice(0, 50);

  const columns: TableColumn<ParsedContactCsvRow>[] = [
    { id: "line", label: "Linha", cell: (row) => row.line, sortValue: (row) => row.line },
    { id: "name", label: "Nome", cell: (row) => row.name || "—", sortValue: (row) => row.name },
    { id: "email", label: "E-mail", cell: (row) => row.email ?? "—", sortValue: (row) => row.email ?? "" },
    { id: "phone", label: "Telefone", cell: (row) => row.phone ?? "—", sortValue: (row) => row.phone ?? "" },
    { id: "status", label: "Situação", cell: (row) => <span className={styles.status} data-valid={row.errors.length === 0}>{row.errors.length ? row.errors.join(" · ") : "Pronto"}</span>, sortValue: (row) => row.errors.join(" ") },
  ];

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setRows([]);
    setFileErrors([]);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileErrors(["O arquivo ultrapassa o limite de 5 MB."]);
      return;
    }
    const parsed = parseContactCsv(await file.text());
    if (parsed.rows.length > MAX_CONTACTS) parsed.errors.push(`O arquivo possui mais de ${MAX_CONTACTS.toLocaleString("pt-BR")} contatos.`);
    setRows(parsed.rows);
    setFileErrors(parsed.errors);
  }

  async function importContacts() {
    if (!validRows.length || fileErrors.length || importing) return;
    setImporting(true);
    try {
      const result = await contactsControllerImportCsv({
        contacts: validRows.map((row) => ({
          id: contactIdFactory.create(),
          name: row.name,
          email: row.email,
          phone: row.phone,
          source: row.source ?? "csv",
          tags: row.tags,
        })),
      });
      notify({
        title: `${result.imported} ${result.imported === 1 ? "contato importado" : "contatos importados"}`,
        description: result.skipped ? `${result.skipped} duplicado(s) já existentes foram ignorados.` : "A lista de contatos já está sendo atualizada.",
        tone: "success",
      });
      navigate("/");
    } catch {
      notify({ title: "Não foi possível importar o arquivo", description: "Nenhum contato foi gravado. Tente novamente.", tone: "error" });
    } finally {
      setImporting(false);
    }
  }

  return <div className={styles.page}>
    <Link to="/" className={styles.back}>← Contatos</Link>
    <PageHeader eyebrow="Gestão de leads" title="Importar contatos" description="Traga uma lista CSV, revise os dados e grave apenas as linhas válidas." />

    <section className={styles.uploadCard}>
      <Field>
        <Label>Arquivo CSV</Label>
        <Input type="file" accept=".csv,text/csv" onChange={(event) => void selectFile(event)} />
      </Field>
      <p>Coluna obrigatória: <strong>Nome</strong>. Também reconhecemos E-mail, Telefone, Origem e Tags. Use vírgula ou ponto e vírgula.</p>
      {fileName && <span className={styles.fileName}>{fileName}</span>}
      {fileErrors.map((error) => <p key={error} className={styles.error} role="alert">{error}</p>)}
    </section>

    {rows.length > 0 && <>
      <div className={styles.summary}>
        <div><span>Linhas lidas</span><strong>{rows.length}</strong></div>
        <div><span>Prontas</span><strong>{validRows.length}</strong></div>
        <div><span>Com problema</span><strong>{invalidRows}</strong></div>
      </div>
      <DataTable label="Prévia da importação" rows={previewRows} columns={columns} rowKey={(row) => String(row.line)} rowLabel={(row) => `Linha ${row.line}`} emptyText="Nenhuma linha encontrada." />
      {rows.length > previewRows.length && <p className={styles.previewNotice}>Mostrando as primeiras {previewRows.length} linhas de {rows.length}.</p>}
      <div className={styles.footerActions}>
        <Button variant="secondary" onClick={() => navigate("/")}>Cancelar</Button>
        <Button loading={importing} disabled={!validRows.length || fileErrors.length > 0} onClick={() => void importContacts()}>Importar {validRows.length} {validRows.length === 1 ? "contato" : "contatos"}</Button>
      </div>
    </>}
  </div>;
}
