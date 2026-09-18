import { useState } from "react";
import type { Meta } from "@storybook/react-vite";
import type { CompanyRegistration, CompanyRegistrationActivity, CompanyRegistrationMember, CompanyRegistrationTaxRegime } from "@spark/core";
import { Modal, ModalContent } from "../Modal/Modal.js";
import { CompanyRegistrationCard } from "./CompanyRegistration.js";
import { CompanyRegistrationDetails } from "./CompanyRegistrationDetails.js";

const meta: Meta<typeof CompanyRegistrationCard> = { title: "Dados/Cadastro da Receita", component: CompanyRegistrationCard };
export default meta;

const registro = (overrides: Partial<CompanyRegistration> = {}): CompanyRegistration => ({
  id: "reg-1", orgId: "org-1", taxId: "00000000000191",
  legalName: "BANCO DO BRASIL SA", tradeName: "Direção Geral",
  registrationStatus: "ATIVA", registrationStatusCode: 2, registrationStatusDate: "2005-11-03",
  registrationStatusReason: "SEM MOTIVO", specialStatus: null, specialStatusDate: null,
  headOffice: true, openedOn: "1966-08-01",
  legalNature: "Sociedade de Economia Mista", legalNatureCode: 2038,
  size: "DEMAIS", sizeCode: 5, shareCapital: 12_000_000_000_000,
  streetKind: "QUADRA", street: "SAUN QUADRA 5 BLOCO B", streetNumber: "SN", complement: "ANDAR T I",
  district: "ASA NORTE", postalCode: "70040912", city: "BRASILIA", cityIbgeCode: 5300108,
  state: "DF", country: null, foreignCity: null,
  phone: "6134939002", secondaryPhone: null, fax: "6134931040", email: null,
  simplesOptant: false, simplesOptedOn: null, simplesLeftOn: "2007-07-01",
  meiOptant: false, meiOptedOn: null, meiLeftOn: null,
  federativeEntity: null,
  source: "https://minhareceita.org", status: "ready", httpStatus: 200,
  fetchedAt: "2026-09-17T00:00:00.000Z", expiresAt: "2026-09-24T00:00:00.000Z", failureCount: 0,
  createdAt: "2026-09-17T00:00:00.000Z", updatedAt: "2026-09-17T00:00:00.000Z",
  ...overrides,
} as CompanyRegistration);

const atividades = [
  { id: "a1", orgId: "org-1", registrationId: "reg-1", code: "6422100", description: "Bancos múltiplos, com carteira comercial", main: true, sortOrder: 0 },
  { id: "a2", orgId: "org-1", registrationId: "reg-1", code: "6499999", description: "Outras atividades de serviços financeiros não especificadas anteriormente", main: false, sortOrder: 1 },
] as unknown as CompanyRegistrationActivity[];

const socios = [
  { id: "m1", orgId: "org-1", registrationId: "reg-1", name: "ALAN CARLOS GUEDES DE OLIVEIRA", maskedTaxId: "***550179**", role: "Diretor", roleCode: 10, joinedOn: "2023-05-17", ageRange: "Entre 41 a 50 anos", country: null, legalRepresentative: null, legalRepresentativeMaskedTaxId: null, legalRepresentativeRole: null, sortOrder: 0 },
  { id: "m2", orgId: "org-1", registrationId: "reg-1", name: "MARIANA PIRES DIAS", maskedTaxId: "***147908**", role: "Conselheiro de Administração", roleCode: 22, joinedOn: "2023-06-12", ageRange: "Entre 41 a 50 anos", country: null, legalRepresentative: null, legalRepresentativeMaskedTaxId: null, legalRepresentativeRole: null, sortOrder: 1 },
] as unknown as CompanyRegistrationMember[];

const regimes = [
  { id: "t1", orgId: "org-1", registrationId: "reg-1", year: 2024, taxation: "LUCRO REAL", bookkeepingCount: 1, scpTaxId: null },
  { id: "t2", orgId: "org-1", registrationId: "reg-1", year: 2023, taxation: "LUCRO REAL", bookkeepingCount: 1, scpTaxId: null },
] as unknown as CompanyRegistrationTaxRegime[];

/**
 * Os quatro estados lado a lado. O ponto é conferir que eles ocupam a MESMA
 * caixa: é o que impede a página de pular quando a resposta chega.
 */
export const Estados = () => <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
  <CompanyRegistrationCard loading taxId="00000000000191" />
  <CompanyRegistrationCard registration={registro()} activities={atividades} onExpand={() => undefined} />
  <CompanyRegistrationCard registration={registro({ status: "not_found", legalName: null })} />
  <CompanyRegistrationCard registration={registro({ status: "failed", legalName: null })} />
</div>;

/** As quatro situações cadastrais, com o tom que cada uma pede. */
export const Situacoes = () => <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
  {["ATIVA", "SUSPENSA", "INAPTA", "BAIXADA"].map((situacao) => (
    <CompanyRegistrationCard key={situacao} registration={registro({ registrationStatus: situacao })} activities={atividades} />
  ))}
</div>;

export const CadastroCompleto = () => {
  const [aberto, setAberto] = useState(true);
  return <Modal open={aberto} onOpenChange={setAberto}>
    <ModalContent title="BANCO DO BRASIL SA" description="Cadastro público da Receita Federal" size="wide">
      <CompanyRegistrationDetails registration={registro()} activities={atividades} members={socios} taxRegimes={regimes} />
    </ModalContent>
  </Modal>;
};
