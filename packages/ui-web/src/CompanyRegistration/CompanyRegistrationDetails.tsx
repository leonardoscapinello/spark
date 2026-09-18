import {
  companyRegistrationAddress,
  formatBRL,
  formatTaxDocument,
  money,
  type CompanyRegistration,
  type CompanyRegistrationActivity,
  type CompanyRegistrationMember,
  type CompanyRegistrationTaxRegime,
} from "@spark/core";
import s from "./CompanyRegistrationDetails.module.css";

export interface CompanyRegistrationDetailsProps {
  registration: CompanyRegistration;
  activities?: readonly CompanyRegistrationActivity[];
  members?: readonly CompanyRegistrationMember[];
  taxRegimes?: readonly CompanyRegistrationTaxRegime[];
}

/**
 * O cadastro inteiro, para dentro de um `ModalContent`.
 *
 * Em seções, e nesta ordem, porque é a ordem em que se pergunta: quem é a
 * empresa, onde ela está, o que ela faz, quem responde por ela, como ela é
 * tributada. Seção vazia não aparece — uma MEI não tem quadro societário, e
 * mostrar «nenhum sócio» é ocupar espaço para dizer nada.
 */
export function CompanyRegistrationDetails({ registration, activities = [], members = [], taxRegimes = [] }: CompanyRegistrationDetailsProps) {
  const endereco = companyRegistrationAddress(registration);
  const secundarias = activities.filter((atividade) => !atividade.main);
  const principal = activities.find((atividade) => atividade.main);

  return <div className={s.details}>
    <Section title="Identificação">
      <Fact label="Razão social" value={registration.legalName} />
      <Fact label="Nome fantasia" value={registration.tradeName} />
      <Fact label="CNPJ" value={formatTaxDocument(registration.taxId)} mono />
      <Fact label="Situação" value={[registration.registrationStatus, registration.registrationStatusDate && `desde ${dataCurta(registration.registrationStatusDate)}`].filter(Boolean).join(", ")} />
      <Fact label="Motivo" value={registration.registrationStatusReason} />
      <Fact label="Situação especial" value={registration.specialStatus} />
      <Fact label="Abertura" value={registration.openedOn && dataCurta(registration.openedOn)} />
      <Fact label="Estabelecimento" value={registration.headOffice === null ? null : registration.headOffice ? "Matriz" : "Filial"} />
      <Fact label="Natureza jurídica" value={registration.legalNature} />
      <Fact label="Porte" value={registration.size} />
      {/* Capital social está em centavos na coluna; `money` é o único caminho
        * para reais em todo o sistema. */}
      <Fact label="Capital social" value={registration.shareCapital === null ? null : formatBRL(money(registration.shareCapital))} />
      <Fact label="Simples Nacional" value={optante(registration.simplesOptant, registration.simplesOptedOn, registration.simplesLeftOn)} />
      <Fact label="MEI" value={optante(registration.meiOptant, registration.meiOptedOn, registration.meiLeftOn)} />
      <Fact label="Ente federativo" value={registration.federativeEntity} />
    </Section>

    <Section title="Endereço e contato">
      <Fact label="Endereço" value={endereco || null} />
      <Fact label="CEP" value={registration.postalCode && formatCep(registration.postalCode)} mono />
      <Fact label="Cidade no exterior" value={registration.foreignCity} />
      <Fact label="País" value={registration.country} />
      <Fact label="Telefone" value={registration.phone && formatTelefone(registration.phone)} mono />
      <Fact label="Outro telefone" value={registration.secondaryPhone && formatTelefone(registration.secondaryPhone)} mono />
      <Fact label="E-mail" value={registration.email} />
    </Section>

    {(principal || secundarias.length > 0) && <Section title="Atividades">
      {principal && <div className={s.activity}><span className={s.code}>{principal.code}</span><span><strong>{principal.description}</strong><span className={s.badge}>Principal</span></span></div>}
      {secundarias.map((atividade) => <div key={atividade.id} className={s.activity}>
        <span className={s.code}>{atividade.code}</span>
        <span>{atividade.description}</span>
      </div>)}
    </Section>}

    {members.length > 0 && <Section title={`Quadro societário (${members.length})`}>
      <ul className={s.members}>
        {members.map((socio) => <li key={socio.id} className={s.member}>
          <strong>{socio.name}</strong>
          <span className={s.muted}>
            {[socio.role, socio.maskedTaxId, socio.joinedOn && `desde ${dataCurta(socio.joinedOn)}`, socio.ageRange].filter(Boolean).join(" · ")}
          </span>
          {socio.legalRepresentative && <span className={s.muted}>Representante legal: {socio.legalRepresentative}</span>}
        </li>)}
      </ul>
    </Section>}

    {taxRegimes.length > 0 && <Section title="Regime tributário">
      <ul className={s.regimes}>
        {taxRegimes.map((regime) => <li key={regime.id} className={s.regime}>
          <span className={s.year}>{regime.year}</span>
          <span>{regime.taxation ?? "Não informado"}</span>
        </li>)}
      </ul>
    </Section>}
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={s.section}><h3 className={s.sectionTitle}>{title}</h3>{children}</section>;
}

/** Campo sem valor não vira linha em branco: some. */
function Fact({ label, value, mono = false }: { label: string; value: string | null | undefined | false; mono?: boolean }) {
  if (!value) return null;
  return <div className={s.fact}>
    <span className={s.factLabel}>{label}</span>
    <span className={s.factValue} data-mono={mono || undefined}>{value}</span>
  </div>;
}

function optante(optante: boolean | null, entrada: string | null, saida: string | null): string | null {
  if (optante === null) return null;
  if (optante) return entrada ? `Optante desde ${dataCurta(entrada)}` : "Optante";
  return saida ? `Não optante, saiu em ${dataCurta(saida)}` : "Não optante";
}

function dataCurta(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : dia;
}

function formatCep(digitos: string): string {
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

/** A Receita junta DDD e número num campo só. */
function formatTelefone(digitos: string): string {
  if (digitos.length < 10) return digitos;
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  const meio = resto.length > 8 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}
