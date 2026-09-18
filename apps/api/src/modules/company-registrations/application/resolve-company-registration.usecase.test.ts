import { describe, expect, it, vi } from "vitest";
import type { CompanyRegistration, OrgId } from "@spark/core";
import { ResolveCompanyRegistrationUseCase } from "./resolve-company-registration.usecase.js";
import { ReceitaLookupError, type ReceitaFetcher } from "../infrastructure/receita-fetcher.js";
import type { CompanyRegistrationsRepository, RegistrationRecord } from "../infrastructure/company-registrations.repository.js";

const org = "01999a61-d07a-7a91-89fc-a9a6bb8c1f43" as OrgId;
/** CNPJ real do Banco do Brasil — dígito verificador válido, dado público. */
const CNPJ = "00000000000191";

function registro(overrides: Partial<CompanyRegistration> = {}): RegistrationRecord {
  return {
    registration: {
      id: "01999a61-d07a-7a91-89fc-a9a6bb8c1f44",
      orgId: org,
      taxId: CNPJ,
      legalName: "BANCO DO BRASIL SA",
      registrationStatus: "ATIVA",
      source: "https://minhareceita.org",
      status: "ready",
      httpStatus: 200,
      fetchedAt: "2026-09-01T00:00:00.000Z",
      expiresAt: "2026-09-08T00:00:00.000Z",
      failureCount: 0,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      ...overrides,
    } as CompanyRegistration,
    activities: [],
    members: [],
    taxRegimes: [],
  };
}

function dublês(existing: RegistrationRecord | null, fetchImpl: () => Promise<never> | Promise<unknown>) {
  const repository = {
    find: vi.fn().mockResolvedValue(existing),
    save: vi.fn().mockImplementation((_org, value, children) => Promise.resolve({ ...registro(value as Partial<CompanyRegistration>), ...(children ? {} : {}), txid: 7 })),
  } as unknown as CompanyRegistrationsRepository;
  const fetcher = { fetch: vi.fn(fetchImpl), source: "https://minhareceita.org" } as unknown as ReceitaFetcher;
  return { repository, fetcher, caso: new ResolveCompanyRegistrationUseCase(repository, fetcher) };
}

describe("ResolveCompanyRegistrationUseCase", () => {
  /* Um número errado não merece uma ida à Receita nem uma linha no banco: a
   * conferência do dígito verificador é local e custa nada. */
  it("recusa CNPJ inválido antes de tocar na rede", async () => {
    const { caso, fetcher } = dublês(null, () => Promise.resolve({}));
    await expect(caso.execute(org, "11222333000100")).rejects.toThrow(/não confere/i);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });

  /* CPF não tem cadastro público. Dizer isso é mais útil que uma consulta que
   * falharia sempre. */
  it("explica que CPF não tem cadastro aberto, em vez de tentar", async () => {
    const { caso, fetcher } = dublês(null, () => Promise.resolve({}));
    await expect(caso.execute(org, "123.456.789-09")).rejects.toThrow(/CPF/);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });

  it("aceita o CNPJ com máscara e consulta só os dígitos", async () => {
    const { caso, fetcher } = dublês(null, () => Promise.resolve({
      registration: { taxId: CNPJ, legalName: "BANCO DO BRASIL SA" }, activities: [], members: [], taxRegimes: [],
      source: "https://minhareceita.org", httpStatus: 200,
    }));
    await caso.execute(org, "00.000.000/0001-91");
    expect(fetcher.fetch).toHaveBeenCalledWith(CNPJ);
  });

  /* A tela precisa mostrar a empresa na hora. Esperar a Receita para exibir o
   * que já está no banco trocaria uma resposta instantânea por uma de oito
   * segundos. */
  it("devolve o cadastro vencido sem esperar a fonte", async () => {
    const travado = new Promise<never>(() => undefined);
    const { caso, repository } = dublês(registro(), () => travado);
    const resultado = await caso.execute(org, CNPJ);
    expect(resultado.registration.legalName).toBe("BANCO DO BRASIL SA");
    expect(resultado.txid).toBe(0);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("não vai à fonte quando o cadastro ainda está no prazo", async () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString();
    const { caso, fetcher } = dublês(registro({ expiresAt: futuro }), () => Promise.resolve({}));
    await caso.execute(org, CNPJ);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });

  it("«atualizar» ignora o prazo e consulta de novo", async () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString();
    const { caso, fetcher } = dublês(registro({ expiresAt: futuro }), () => Promise.resolve({
      registration: { taxId: CNPJ }, activities: [], members: [], taxRegimes: [], source: "https://minhareceita.org", httpStatus: 200,
    }));
    await caso.execute(org, CNPJ, true);
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
  });

  /* CNPJ inexistente é RESPOSTA, não falha: guardar evita repetir a consulta a
   * cada abertura da tela. */
  it("guarda «não encontrado» como resposta definitiva", async () => {
    const { caso, repository } = dublês(null, () => Promise.reject(new ReceitaLookupError("não existe", 404, true)));
    const resultado = await caso.execute(org, CNPJ);
    expect(resultado.registration.status).toBe("not_found");
    expect(repository.save).toHaveBeenCalledWith(org, expect.objectContaining({ status: "not_found", failureCount: 0 }), { activities: [], members: [], taxRegimes: [] });
  });

  /* Rede fora não apaga o que já se sabia da empresa. O registro continua
   * «ready» e visível; só a validade é empurrada para frente. */
  it("falha de rede preserva o cadastro que já existia", async () => {
    const { caso, repository } = dublês(registro(), () => Promise.reject(new ReceitaLookupError("timeout", null)));
    const resultado = await caso.execute(org, CNPJ, true);
    expect(resultado.registration.status).toBe("ready");
    expect(repository.save).toHaveBeenCalledWith(org, expect.objectContaining({ status: "ready", failureCount: 1 }), null);
  });

  it("cadastro que nunca chegou fica marcado como falho", async () => {
    const { caso, repository } = dublês(null, () => Promise.reject(new ReceitaLookupError("timeout", null)));
    const resultado = await caso.execute(org, CNPJ);
    expect(resultado.registration.status).toBe("failed");
    expect(repository.save).toHaveBeenCalledWith(org, expect.objectContaining({ status: "failed", failureCount: 1 }), null);
  });

  /* Falhar de novo não pode virar uma consulta por segundo: a espera cresce. */
  it("espera mais a cada falha seguida", async () => {
    const { caso, repository } = dublês(registro({ status: "failed", failureCount: 3 }), () => Promise.reject(new ReceitaLookupError("timeout", null)));
    await caso.execute(org, CNPJ, true);
    const gravado = vi.mocked(repository.save).mock.calls[0]?.[1];
    const espera = new Date(gravado!.expiresAt).getTime() - new Date(gravado!.fetchedAt).getTime();
    expect(espera).toBe(15 * 60 * 1_000 * 2 ** 3);
  });
});
