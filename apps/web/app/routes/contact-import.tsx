import { useMemo, useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import type { Route } from "./+types/contact-import";
import { contactsControllerImportCsv } from "@spark/api-client";
import { contactId as contactIdFactory, parseContactCsv, type ParsedContactCsvRow } from "@spark/core";
import { BackLink, Button, Chip, DashboardGrid, DataTable, FilePicker, FormMessage, KpiCard, PageFrame, PageHeader, SectionTitle, Text, notify, type TableColumn } from "@spark/ui-web";
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
    { id: "line", label: "Linha", align: "end", cell: (row) => row.line, sortValue: (row) => row.line },
    { id: "name", label: "Nome", cell: (row) => row.name || "—", sortValue: (row) => row.name },
    { id: "email", label: "E-mail", cell: (row) => row.email ?? "—", sortValue: (row) => row.email ?? "" },
    { id: "phone", label: "Telefone", cell: (row) => row.phone ?? "—", sortValue: (row) => row.phone ?? "" },
    { id: "status", label: "Situação", cell: (row) => row.errors.length ? <span className={styles.rowIssue}><Chip tone="danger" dot>Revisar</Chip><Text size="pequeno" tone="secondary">{row.errors.join(" · ")}</Text></span> : <Chip tone="success" dot>Pronto</Chip>, sortValue: (row) => row.errors.join(" ") },
  ];

  async function selectFile(file: File | undefined) {
    setRows([]);
    setFileErrors([]);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileErrors(["O arquivo ultrapassa o limite de 5 MB."]);
      return;
    }
    const parsed = parseContactCsv(await file.text());
    if (parsed.rows.length > MAX_CONTACTS) parsed.errors.push(`O arquivo possui mais de ${MAX_CONTACTS.toLocaleString("pt-BR")} pessoas.`);
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
        title: `${result.imported} ${result.imported === 1 ? "pessoa importada" : "pessoas importadas"}`,
        description: result.skipped ? `${result.skipped} duplicado(s) já existentes foram ignorados.` : "A lista de pessoas já está sendo atualizada.",
        tone: "success",
      });
      navigate("/");
    } catch {
      notify({ title: "Não foi possível importar o arquivo", description: "Nenhuma pessoa foi gravada. Tente novamente.", tone: "error" });
    } finally {
      setImporting(false);
    }
  }

  return <PageFrame className={styles.page}>
    <PageHeader back={<BackLink render={<Link to="/" />}>Pessoas</BackLink>} title="Importar pessoas" description="Traga uma lista CSV, revise os dados e grave apenas as linhas válidas." />

    <section className={styles.uploadSection} aria-label="Selecionar arquivo CSV">
      <SectionTitle level="card" meta="Etapa 1 de 2">Selecione o arquivo</SectionTitle>
      <FilePicker accept=".csv,text/csv" multiple={false} label="Solte o CSV aqui ou escolha no computador" hint="Até 5 MB · até 2.000 pessoas" {...(fileName ? { selectedName: fileName } : {})} onFiles={(files) => void selectFile(files[0])} />
      <Text as="p" size="pequeno" tone="secondary">Coluna obrigatória: <Text as="strong" size="pequeno" weight="medium">Nome</Text>. Também reconhecemos E-mail, Telefone, Origem e Tags. Use vírgula ou ponto e vírgula.</Text>
      {fileErrors.map((error) => <FormMessage key={error}>{error}</FormMessage>)}
    </section>

    {rows.length > 0 && <>
      <SectionTitle level="card" meta="Etapa 2 de 2">Revise as linhas</SectionTitle>
      <DashboardGrid metrics>
        <KpiCard label="Linhas lidas" value={rows.length.toLocaleString("pt-BR")} />
        <KpiCard label="Prontas" value={validRows.length.toLocaleString("pt-BR")} />
        <KpiCard label="Com problema" value={invalidRows.toLocaleString("pt-BR")} {...(invalidRows > 0 ? { delta: { label: "Revisar", tone: "negative" as const } } : {})} />
      </DashboardGrid>
      <DataTable label="Prévia da importação" rows={previewRows} columns={columns} rowKey={(row) => String(row.line)} rowLabel={(row) => `Linha ${row.line}`} emptyText="Nenhuma linha encontrada." />
      {rows.length > previewRows.length && <Text as="p" size="pequeno" tone="secondary">Mostrando as primeiras {previewRows.length} linhas de {rows.length}.</Text>}
      <div className={styles.footerActions}>
        <Button variant="secondary" onClick={() => navigate("/")}>Cancelar</Button>
        <Button loading={importing} disabled={!validRows.length || fileErrors.length > 0} onClick={() => void importContacts()}>Importar {validRows.length} {validRows.length === 1 ? "pessoa" : "pessoas"}</Button>
      </div>
    </>}
  </PageFrame>;
}
