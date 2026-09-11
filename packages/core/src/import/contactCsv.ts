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

const HEADER_ALIASES = {
  name: ["nome", "name", "nome completo", "full name", "pessoa"],
  email: ["email", "e mail", "e-mail"],
  phone: ["telefone", "phone", "celular", "mobile", "whatsapp"],
  source: ["origem", "source"],
  tags: ["tags", "tag", "etiquetas", "etiqueta"],
} as const;

export function parseContactCsv(contents: string): ContactCsvResult {
  const normalized = contents.replace(/^\uFEFF/, "");
  const candidates = [parseRows(normalized, ";"), parseRows(normalized, ",")];
  const records = candidates.sort((left, right) => (right[0]?.length ?? 0) - (left[0]?.length ?? 0))[0] ?? [];
  if (!records.length) return { rows: [], errors: ["O arquivo está vazio."] };

  const headers = records[0]?.map(normalizeHeader) ?? [];
  const nameIndex = findHeader(headers, HEADER_ALIASES.name);
  if (nameIndex < 0) return { rows: [], errors: ["Inclua uma coluna Nome no arquivo."] };

  const emailIndex = findHeader(headers, HEADER_ALIASES.email);
  const phoneIndex = findHeader(headers, HEADER_ALIASES.phone);
  const sourceIndex = findHeader(headers, HEADER_ALIASES.source);
  const tagsIndex = findHeader(headers, HEADER_ALIASES.tags);
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const rows = records.slice(1).filter((cells) => cells.some((cell) => cell.trim())).map((cells, index) => {
    const line = index + 2;
    const name = valueAt(cells, nameIndex);
    const errors: string[] = [];
    if (!name) errors.push("Nome obrigatório");

    const emailValue = valueAt(cells, emailIndex);
    let parsedEmail: Email | null = null;
    if (emailValue) {
      try { parsedEmail = email(emailValue); }
      catch { errors.push("E-mail inválido"); }
    }

    const phoneValue = valueAt(cells, phoneIndex);
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
      source: valueAt(cells, sourceIndex) || null,
      tags: valueAt(cells, tagsIndex).split(/[|,]/).map((tag) => tag.trim()).filter(Boolean),
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

function findHeader(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header as never));
}

function valueAt(row: string[], index: number): string {
  return index < 0 ? "" : (row[index] ?? "").trim();
}
