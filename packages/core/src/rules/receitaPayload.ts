import type {
  CompanyRegistration,
  CompanyRegistrationActivity,
  CompanyRegistrationMember,
  CompanyRegistrationTaxRegime,
} from "../schema/companyRegistration.js";

/**
 * O retorno público da Receita Federal traduzido para as nossas colunas.
 *
 * Vive aqui, e não no módulo do backend, porque é **regra**, não infraestrutura:
 * capital social vira centavo inteiro, texto vazio vira ausência de valor, data
 * fora de formato vira nulo em vez de derrubar a gravação. São decisões sobre o
 * significado do dado, e são testáveis sem subir nada.
 *
 * O formato de origem é o do **Minha Receita** (código aberto, auto-hospedável)
 * — e a BrasilAPI devolve exatamente as mesmas 48 chaves, o que faz das duas
 * fontes intercambiáveis por uma variável de ambiente, com um tradutor só.
 */

/** O que a fonte devolve. Tudo opcional: é contrato de terceiro, não nosso. */
export interface ReceitaPayload {
  cnpj?: unknown;
  razao_social?: unknown;
  nome_fantasia?: unknown;
  situacao_cadastral?: unknown;
  descricao_situacao_cadastral?: unknown;
  data_situacao_cadastral?: unknown;
  descricao_motivo_situacao_cadastral?: unknown;
  situacao_especial?: unknown;
  data_situacao_especial?: unknown;
  identificador_matriz_filial?: unknown;
  data_inicio_atividade?: unknown;
  natureza_juridica?: unknown;
  codigo_natureza_juridica?: unknown;
  porte?: unknown;
  codigo_porte?: unknown;
  capital_social?: unknown;
  descricao_tipo_de_logradouro?: unknown;
  logradouro?: unknown;
  numero?: unknown;
  complemento?: unknown;
  bairro?: unknown;
  cep?: unknown;
  municipio?: unknown;
  codigo_municipio_ibge?: unknown;
  uf?: unknown;
  pais?: unknown;
  nome_cidade_no_exterior?: unknown;
  ddd_telefone_1?: unknown;
  ddd_telefone_2?: unknown;
  ddd_fax?: unknown;
  email?: unknown;
  opcao_pelo_simples?: unknown;
  data_opcao_pelo_simples?: unknown;
  data_exclusao_do_simples?: unknown;
  opcao_pelo_mei?: unknown;
  data_opcao_pelo_mei?: unknown;
  data_exclusao_do_mei?: unknown;
  ente_federativo_responsavel?: unknown;
  cnae_fiscal?: unknown;
  cnae_fiscal_descricao?: unknown;
  cnaes_secundarios?: unknown;
  qsa?: unknown;
  regime_tributario?: unknown;
}

/** Os campos do registro que vêm da fonte — o resto é nosso (id, org, prazos). */
export type CompanyRegistrationFacts = Omit<
  CompanyRegistration,
  "id" | "orgId" | "source" | "status" | "httpStatus" | "fetchedAt" | "expiresAt" | "failureCount" | "createdAt" | "updatedAt"
>;

export type CompanyRegistrationActivityFacts = Omit<CompanyRegistrationActivity, "id" | "orgId" | "registrationId">;
export type CompanyRegistrationMemberFacts = Omit<CompanyRegistrationMember, "id" | "orgId" | "registrationId">;
export type CompanyRegistrationTaxRegimeFacts = Omit<CompanyRegistrationTaxRegime, "id" | "orgId" | "registrationId">;

export interface CompanyRegistrationParts {
  registration: CompanyRegistrationFacts;
  activities: CompanyRegistrationActivityFacts[];
  members: CompanyRegistrationMemberFacts[];
  taxRegimes: CompanyRegistrationTaxRegimeFacts[];
}

/**
 * Traduz o retorno da fonte. `taxId` entra por parâmetro porque é o que foi
 * PEDIDO: se a fonte devolver outro CNPJ, quem grava precisa perceber, e não
 * herdar silenciosamente a chave errada.
 */
export function parseReceitaPayload(taxId: string, payload: ReceitaPayload): CompanyRegistrationParts {
  return {
    registration: {
      taxId,
      legalName: texto(payload.razao_social, 300),
      tradeName: texto(payload.nome_fantasia, 300),
      registrationStatus: texto(payload.descricao_situacao_cadastral, 60),
      registrationStatusCode: inteiro(payload.situacao_cadastral),
      registrationStatusDate: dia(payload.data_situacao_cadastral),
      registrationStatusReason: texto(payload.descricao_motivo_situacao_cadastral, 200),
      specialStatus: texto(payload.situacao_especial, 200),
      specialStatusDate: dia(payload.data_situacao_especial),
      // 1 é matriz, 2 é filial. Um código desconhecido vira ausência de
      // resposta, não um «false» que afirmaria ser filial.
      headOffice: matrizOuFilial(payload.identificador_matriz_filial),
      openedOn: dia(payload.data_inicio_atividade),
      legalNature: texto(payload.natureza_juridica, 200),
      legalNatureCode: inteiro(payload.codigo_natureza_juridica),
      size: texto(payload.porte, 60),
      sizeCode: inteiro(payload.codigo_porte),
      shareCapital: centavos(payload.capital_social),
      streetKind: texto(payload.descricao_tipo_de_logradouro, 60),
      street: texto(payload.logradouro, 300),
      streetNumber: texto(payload.numero, 60),
      complement: texto(payload.complemento, 300),
      district: texto(payload.bairro, 200),
      postalCode: digitos(payload.cep, 8),
      city: texto(payload.municipio, 200),
      cityIbgeCode: inteiro(payload.codigo_municipio_ibge),
      state: texto(payload.uf, 2),
      country: texto(payload.pais, 100),
      foreignCity: texto(payload.nome_cidade_no_exterior, 200),
      phone: digitos(payload.ddd_telefone_1, 20),
      secondaryPhone: digitos(payload.ddd_telefone_2, 20),
      fax: digitos(payload.ddd_fax, 20),
      email: texto(payload.email, 320)?.toLowerCase() ?? null,
      simplesOptant: booleano(payload.opcao_pelo_simples),
      simplesOptedOn: dia(payload.data_opcao_pelo_simples),
      simplesLeftOn: dia(payload.data_exclusao_do_simples),
      meiOptant: booleano(payload.opcao_pelo_mei),
      meiOptedOn: dia(payload.data_opcao_pelo_mei),
      meiLeftOn: dia(payload.data_exclusao_do_mei),
      federativeEntity: texto(payload.ente_federativo_responsavel, 200),
    },
    activities: atividades(payload),
    members: socios(payload),
    taxRegimes: regimes(payload),
  };
}

function atividades(payload: ReceitaPayload): CompanyRegistrationActivityFacts[] {
  const lista: CompanyRegistrationActivityFacts[] = [];
  const principal = cnae(payload.cnae_fiscal);
  if (principal !== null) {
    lista.push({ code: principal, description: texto(payload.cnae_fiscal_descricao, 400) ?? "", main: true, sortOrder: 0 });
  }
  for (const bruto of comoLista(payload.cnaes_secundarios)) {
    const codigo = cnae(campo(bruto, "codigo"));
    if (codigo === null) continue;
    lista.push({ code: codigo, description: texto(campo(bruto, "descricao"), 400) ?? "", main: false, sortOrder: lista.length });
  }
  return lista;
}

function socios(payload: ReceitaPayload): CompanyRegistrationMemberFacts[] {
  const lista: CompanyRegistrationMemberFacts[] = [];
  for (const bruto of comoLista(payload.qsa)) {
    const nome = texto(campo(bruto, "nome_socio"), 300);
    // Sócio sem nome não é sócio: é linha vazia do arquivo da Receita.
    if (nome === null) continue;
    lista.push({
      name: nome,
      maskedTaxId: texto(campo(bruto, "cnpj_cpf_do_socio"), 20),
      role: texto(campo(bruto, "qualificacao_socio"), 200),
      roleCode: inteiro(campo(bruto, "codigo_qualificacao_socio")),
      joinedOn: dia(campo(bruto, "data_entrada_sociedade")),
      ageRange: texto(campo(bruto, "faixa_etaria"), 60),
      country: texto(campo(bruto, "pais"), 100),
      legalRepresentative: texto(campo(bruto, "nome_representante_legal"), 300),
      legalRepresentativeMaskedTaxId: texto(campo(bruto, "cpf_representante_legal"), 20),
      legalRepresentativeRole: texto(campo(bruto, "qualificacao_representante_legal"), 200),
      sortOrder: lista.length,
    });
  }
  return lista;
}

function regimes(payload: ReceitaPayload): CompanyRegistrationTaxRegimeFacts[] {
  const lista: CompanyRegistrationTaxRegimeFacts[] = [];
  for (const bruto of comoLista(payload.regime_tributario)) {
    const ano = inteiro(campo(bruto, "ano"));
    if (ano === null) continue;
    lista.push({
      year: ano,
      taxation: texto(campo(bruto, "forma_de_tributacao"), 200),
      bookkeepingCount: inteiro(campo(bruto, "quantidade_de_escrituracoes")),
      scpTaxId: digitos(campo(bruto, "cnpj_da_scp"), 14),
    });
  }
  return lista.sort((a, b) => b.year - a.year);
}

/* ---- conversões ---------------------------------------------------------
 * A Receita mistura ausência com vazio: `null`, `""` e `"  "` significam a
 * mesma coisa e precisam virar a mesma coisa aqui. Sem isso a tela mostraria
 * campos em branco como se tivessem conteúdo, e um filtro «tem e-mail»
 * devolveria empresas sem e-mail. */

function texto(valor: unknown, limite: number): string | null {
  if (typeof valor === "number") return String(valor).slice(0, limite);
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo.slice(0, limite);
}

function digitos(valor: unknown, limite: number): string | null {
  const bruto = texto(valor, 64);
  if (bruto === null) return null;
  const apenas = bruto.replace(/\D/g, "");
  return apenas === "" ? null : apenas.slice(0, limite);
}

function inteiro(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.trunc(valor) : null;
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? Math.trunc(convertido) : null;
}

function booleano(valor: unknown): boolean | null {
  if (typeof valor === "boolean") return valor;
  if (valor === "SIM" || valor === "true") return true;
  if (valor === "NAO" || valor === "NÃO" || valor === "false") return false;
  return null;
}

/**
 * Capital social chega em REAIS e pode ter centavos («1500.5»). Vira centavo
 * inteiro porque é dinheiro, e dinheiro aqui nunca é ponto flutuante.
 */
function centavos(valor: unknown): number | null {
  const bruto = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() !== "" ? Number(valor) : null;
  if (bruto === null || !Number.isFinite(bruto)) return null;
  return Math.round(bruto * 100);
}

/** Aceita «2005-11-03» e o mesmo dia com hora; o resto não é data. */
function dia(valor: unknown): string | null {
  const bruto = texto(valor, 40);
  if (bruto === null) return null;
  const encontrado = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  return encontrado ? encontrado[0] : null;
}

/** CNAE vem como número («6422100») e precisa manter os sete dígitos. */
function cnae(valor: unknown): string | null {
  const apenas = digitos(valor, 10);
  return apenas === null ? null : apenas.padStart(7, "0");
}

function matrizOuFilial(valor: unknown): boolean | null {
  const codigo = inteiro(valor);
  if (codigo === 1) return true;
  if (codigo === 2) return false;
  return null;
}

function comoLista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function campo(valor: unknown, chave: string): unknown {
  return valor !== null && typeof valor === "object" ? (valor as Record<string, unknown>)[chave] : undefined;
}
