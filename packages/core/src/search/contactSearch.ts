import type { Contact } from "../schema/contact.js";

/**
 * Busca de contato roda inteira sobre a coleção local — tela sincronizada
 * nunca faz chamada de rede pra procurar (docs/adr/0018, CLAUDE.md regra
 * 5). Ignora acento: nome de gente em português tem, e ninguém digita
 * "Jose" esperando não achar "José".
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function contatoCorresponde(contato: Pick<Contact, "nome" | "email" | "telefone">, termo: string): boolean {
  const alvo = normalizar(termo.trim());
  if (!alvo) return true;

  return (
    normalizar(contato.nome).includes(alvo) ||
    (contato.email !== null && normalizar(contato.email).includes(alvo)) ||
    (contato.telefone !== null && normalizar(contato.telefone).includes(alvo))
  );
}
