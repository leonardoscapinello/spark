import { email, type Email } from "../format/email.js";
import { phone, type Phone } from "../format/phone.js";

export interface ParsedContactCsvRow {
  line: number;
  name: string;
  email: Email | null;
  phone: Phone | null;
  source: string | null;
  tags: string[];
  errors: string[];
}

export interface ContactCsvResult {
  rows: ParsedContactCsvRow[];
  errors: string[];
}

/* Cabeçalhos já normalizados (minúsculas, sem acento, "-"/"_" viram espaço).
 * Além dos nomes soltos, cobre a exportação de pessoas do Pipedrive em
 * português e inglês: "Email - Work", "Telefone - Celular", "Person - Name",
 * "Etiquetas"… Uma pessoa pode ter várias colunas de e-mail/telefone; todas
 * casam, e a linha usa a primeira preenchida. */
const HEADER_ALIASES = {
  name: ["nome", "name", "nome completo", "full name", "pessoa", "person name", "pessoa nome", "contact name", "nome do contato", "nome da pessoa"],
  firstName: ["primeiro nome", "first name", "nome proprio"],
  lastName: ["sobrenome", "last name", "ultimo nome"],
  email: ["email", "e mail", "person email", "email principal", "primary email",
    "email work", "email home", "email other", "email trabalho", "email casa", "email outro",
    "e mail work", "e mail home", "e mail other", "e mail trabalho", "e mail casa", "e mail outro"],
  phone: ["telefone", "phone", "celular", "mobile", "whatsapp", "person phone", "telefone principal", "primary phone",
    "phone work", "phone mobile", "phone home", "phone other",
    "telefone trabalho", "telefone celular", "telefone casa", "telefone outro"],
  source: ["origem", "source", "source origin", "origem da fonte", "fonte", "lead source", "origem do lead", "canal"],
  tags: ["tags", "tag", "etiquetas", "etiqueta", "label", "labels", "rotulo", "rotulos", "person label"],
} as const;

export function parseContactCsv(contents: string): ContactCsvResult {
  const normalized = contents.replace(/^\uFEFF/, "");
  const candidates = [parseRows(normalized, ";"), parseRows(normalized, ",")];
  const records = candidates.sort((left, right) => (right[0]?.length ?? 0) - (left[0]?.length ?? 0))[0] ?? [];
  if (!records.length) return { rows: [], errors: ["O arquivo está vazio."] };

  const headers = records[0]?.map(normalizeHeader) ?? [];
  // Sem coluna Nome, "Primeiro nome" + "Sobrenome" (exportação do Pipedrive) compõem o nome.
  const nameIndexes = findHeaders(headers, HEADER_ALIASES.name);
  const nameParts = nameIndexes.length ? [] : [findHeaders(headers, HEADER_ALIASES.firstName), findHeaders(headers, HEADER_ALIASES.lastName)];
  if (!nameIndexes.length && !nameParts.some((part) => part.length)) return { rows: [], errors: ["Inclua uma coluna Nome no arquivo."] };

  const emailIndexes = findHeaders(headers, HEADER_ALIASES.email);
  const phoneIndexes = findHeaders(headers, HEADER_ALIASES.phone);
  const sourceIndexes = findHeaders(headers, HEADER_ALIASES.source);
  const tagsIndexes = findHeaders(headers, HEADER_ALIASES.tags);
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const rows = records.slice(1).filter((cells) => cells.some((cell) => cell.trim())).map((cells, index) => {
    const line = index + 2;
    const name = nameIndexes.length ? valueAt(cells, nameIndexes) : nameParts.map((part) => valueAt(cells, part)).filter(Boolean).join(" ");
    const errors: string[] = [];
    if (!name) errors.push("Nome obrigatório");

    const emailValue = valueAt(cells, emailIndexes);
    let parsedEmail: Email | null = null;
    if (emailValue) {
      try { parsedEmail = email(emailValue); }
      catch { errors.push("E-mail inválido"); }
    }

    const phoneValue = valueAt(cells, phoneIndexes);
    let parsedPhone: Phone | null = null;
    if (phoneValue) {
      try { parsedPhone = phone(phoneValue); }
      catch { errors.push("Telefone inválido"); }
    }

    if (parsedEmail && seenEmails.has(parsedEmail)) errors.push("E-mail repetido no arquivo");
    if (parsedPhone && seenPhones.has(parsedPhone)) errors.push("Telefone repetido no arquivo");
    if (parsedEmail) seenEmails.add(parsedEmail);
    if (parsedPhone) seenPhones.add(parsedPhone);

    return {
      line,
      name,
      email: parsedEmail,
      phone: parsedPhone,
      source: valueAt(cells, sourceIndexes) || null,
      tags: valueAt(cells, tagsIndexes).split(/[|,]/).map((tag) => tag.trim()).filter(Boolean),
      errors,
    };
  });
  return { rows, errors: rows.length ? [] : ["O arquivo não possui contatos."] };
}

function parseRows(contents: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index];
    if (character === '"') {
      if (quoted && contents[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && contents[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findHeaders(headers: string[], aliases: readonly string[]): number[] {
  return headers.flatMap((header, index) => (aliases.includes(header as never) ? [index] : []));
}

/** Primeiro valor preenchido entre as colunas que casaram (Pipedrive: e-mail de trabalho vazio, de casa cheio). */
function valueAt(row: string[], indexes: readonly number[]): string {
  for (const index of indexes) {
    const value = (row[index] ?? "").trim();
    if (value) return value;
  }
  return "";
}
