import { BadRequestException, Injectable } from "@nestjs/common";
import { companyRegistrationNeedsRefresh, isValidCnpj, type CompanyRegistration, type OrgId } from "@spark/core";
import { ReceitaFetcher, ReceitaLookupError } from "../infrastructure/receita-fetcher.js";
import { CompanyRegistrationsRepository, type RegistrationRecord } from "../infrastructure/company-registrations.repository.js";

/* O cadastro da Receita muda em ritmo de mês, não de minuto: a base pública é
 * republicada mensalmente. Uma semana de validade equilibra dado atual com não
 * bater na fonte a cada abertura de tela. */
const TTL_SECONDS = 7 * 24 * 60 * 60;
/* CNPJ inexistente também é resposta, e vale guardar — senão toda abertura da
 * tela repete a mesma consulta que já se sabe que não dá em nada. Um dia,
 * porque empresa recém-aberta leva algumas semanas para entrar na base. */
const NOT_FOUND_TTL_SECONDS = 24 * 60 * 60;
const MIN_RETRY_SECONDS = 15 * 60;
const MAX_RETRY_SECONDS = 24 * 60 * 60;

@Injectable()
export class ResolveCompanyRegistrationUseCase {
  private readonly refreshes = new Map<string, Promise<void>>();

  constructor(private readonly registrations: CompanyRegistrationsRepository, private readonly fetcher: ReceitaFetcher) {}

  async execute(orgId: OrgId, rawTaxId: string, refresh = false): Promise<RegistrationRecord & { txid: number }> {
    const taxId = normalizeTaxId(rawTaxId);
    const existing = await this.registrations.find(orgId, taxId);

    if (existing && !refresh) {
      /* Responde com o que já se sabe e reconsulta por fora quando venceu: a
       * tela mostra a empresa na hora, e o dado novo chega pela sincronização
       * quando chegar. Esperar a Receita para exibir o que já está no banco
       * seria trocar uma resposta instantânea por uma de oito segundos. */
      if (companyRegistrationNeedsRefresh(existing.registration)) this.refreshInBackground(orgId, taxId);
      return { ...existing, txid: 0 };
    }

    return this.resolveFresh(orgId, taxId, existing);
  }

  private refreshInBackground(orgId: OrgId, taxId: string): void {
    const key = `${orgId}:${taxId}`;
    if (this.refreshes.has(key)) return;
    const operation = this.registrations.find(orgId, taxId)
      .then((existing) => this.resolveFresh(orgId, taxId, existing))
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => this.refreshes.delete(key));
    this.refreshes.set(key, operation);
  }

  private async resolveFresh(orgId: OrgId, taxId: string, existing: RegistrationRecord | null): Promise<RegistrationRecord & { txid: number }> {
    const fetchedAt = new Date();
    try {
      const lookup = await this.fetcher.fetch(taxId);
      return this.registrations.save(orgId, {
        ...lookup.registration,
        source: lookup.source,
        status: "ready",
        httpStatus: lookup.httpStatus,
        fetchedAt,
        expiresAt: new Date(fetchedAt.getTime() + TTL_SECONDS * 1_000),
        failureCount: 0,
      }, { activities: lookup.activities, members: lookup.members, taxRegimes: lookup.taxRegimes });
    } catch (cause) {
      const erro = cause instanceof ReceitaLookupError ? cause : null;
      const failureCount = erro?.notFound ? 0 : (existing?.registration.failureCount ?? 0) + 1;
      const retrySeconds = erro?.notFound
        ? NOT_FOUND_TTL_SECONDS
        : Math.min(MAX_RETRY_SECONDS, MIN_RETRY_SECONDS * 2 ** Math.min(failureCount - 1, 7));

      /* Uma falha de rede não apaga o que já se sabia: o registro anterior
       * continua «ready» e visível, e só a validade é empurrada para frente.
       * Só um cadastro que nunca chegou fica marcado como falho. */
      const status: CompanyRegistration["status"] = erro?.notFound
        ? "not_found"
        : existing?.registration.status === "ready" ? "ready" : "failed";

      const saved = await this.registrations.save(orgId, {
        ...(existing ? factsOf(existing.registration) : emptyFacts(taxId)),
        source: this.fetcher.source,
        status,
        httpStatus: erro?.httpStatus ?? existing?.registration.httpStatus ?? null,
        fetchedAt,
        expiresAt: new Date(fetchedAt.getTime() + retrySeconds * 1_000),
        failureCount,
      }, erro?.notFound ? { activities: [], members: [], taxRegimes: [] } : null);
      return saved;
    }
  }
}

/**
 * Só CNPJ tem cadastro público — CPF não, e dizer isso é mais útil do que uma
 * consulta que sempre falharia. O dígito verificador é conferido antes da rede:
 * um número errado não merece uma ida à Receita nem uma linha no banco.
 */
function normalizeTaxId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) throw new BadRequestException("A consulta pública é de CNPJ. CPF não tem cadastro aberto na Receita Federal.");
  if (digits.length !== 14) throw new BadRequestException("Informe um CNPJ com 14 dígitos.");
  if (!isValidCnpj(digits)) throw new BadRequestException("Esse CNPJ não confere. Revise os números.");
  return digits;
}

function factsOf(registration: CompanyRegistration) {
  const { id: _id, orgId: _orgId, source: _source, status: _status, httpStatus: _httpStatus, fetchedAt: _fetchedAt, expiresAt: _expiresAt, failureCount: _failureCount, createdAt: _createdAt, updatedAt: _updatedAt, ...facts } = registration;
  return facts;
}

function emptyFacts(taxId: string) {
  return {
    taxId,
    legalName: null, tradeName: null,
    registrationStatus: null, registrationStatusCode: null, registrationStatusDate: null, registrationStatusReason: null,
    specialStatus: null, specialStatusDate: null,
    headOffice: null, openedOn: null,
    legalNature: null, legalNatureCode: null, size: null, sizeCode: null, shareCapital: null,
    streetKind: null, street: null, streetNumber: null, complement: null, district: null,
    postalCode: null, city: null, cityIbgeCode: null, state: null, country: null, foreignCity: null,
    phone: null, secondaryPhone: null, fax: null, email: null,
    simplesOptant: null, simplesOptedOn: null, simplesLeftOn: null,
    meiOptant: null, meiOptedOn: null, meiLeftOn: null,
    federativeEntity: null,
  };
}
