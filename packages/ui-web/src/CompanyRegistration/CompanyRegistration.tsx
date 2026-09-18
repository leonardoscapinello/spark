import { formatTaxDocument, type CompanyRegistration, type CompanyRegistrationActivity } from "@spark/core";
import { Icon } from "../Icon/Icon.js";
import s from "./CompanyRegistration.module.css";

export interface CompanyRegistrationCardProps {
  registration?: CompanyRegistration | null;
  activities?: readonly CompanyRegistrationActivity[];
  loading?: boolean;
  taxId?: string;
  /** Abre o cadastro inteiro. Sem isto, o rodapé não aparece. */
  onExpand?: () => void;
}

/**
 * O cartão que aparece ao passar o mouse num CNPJ.
 *
 * **Altura fixa**, como a prévia de link: carregando, indisponível e pronto
 * ocupam a mesma caixa. Um cartão que muda de tamanho enquanto a resposta chega
 * é a própria coisa que se quer evitar — a página inteira pula por baixo dele.
 *
 * Mostra o que decide uma conversa de venda em dois segundos: se a empresa está
 * ativa, qual é o nome de verdade, o que ela faz e onde fica. O resto — sócios,
 * capital, endereço completo, regimes — é um clique adiante, porque raramente é
 * o que se quer no meio do atendimento.
 */
export function CompanyRegistrationCard({ registration, activities = [], loading = false, taxId, onExpand }: CompanyRegistrationCardProps) {
  if (loading && !registration) {
    return <div className={s.card} role="status" aria-label="Consultando o CNPJ na Receita Federal">
      <div className={s.head}><span className={s.pill} data-tone="neutral">Consultando…</span></div>
      <div className={s.body}>
        <span className={s.skeleton} />
        <span className={s.skeleton} data-short="true" />
      </div>
      <div className={s.meta}><span className={s.document}>{taxId ? formatTaxDocument(taxId) : ""}</span></div>
    </div>;
  }

  if (!registration || registration.status !== "ready") {
    const naoEncontrado = registration?.status === "not_found";
    return <div className={s.card}>
      <div className={s.head}><span className={s.pill} data-tone="neutral">{naoEncontrado ? "Não encontrado" : "Indisponível"}</span></div>
      <div className={s.body}>
        <strong className={s.name}>{naoEncontrado ? "Sem cadastro na Receita" : "Consulta indisponível"}</strong>
        <span className={s.muted}>{naoEncontrado
          ? "Este CNPJ não consta na base pública. Empresa recém-aberta leva algumas semanas para aparecer."
          : "Não foi possível falar com a base pública agora. A consulta será repetida mais tarde."}</span>
      </div>
      <div className={s.meta}><span className={s.document}>{formatTaxDocument(registration?.taxId ?? taxId ?? "")}</span></div>
    </div>;
  }

  const principal = activities.find((atividade) => atividade.main);
  const local = [registration.city, registration.state].filter(Boolean).join(" · ");

  return <div className={s.card}>
    <div className={s.head}>
      <span className={s.pill} data-tone={situationTone(registration.registrationStatus)}>{registration.registrationStatus ?? "Situação desconhecida"}</span>
      {registration.headOffice !== null && <span className={s.branch}>{registration.headOffice ? "Matriz" : "Filial"}</span>}
    </div>

    <div className={s.body}>
      <strong className={s.name}>{registration.legalName ?? formatTaxDocument(registration.taxId)}</strong>
      {registration.tradeName && registration.tradeName !== registration.legalName && <span className={s.muted}>{registration.tradeName}</span>}
      {principal && <span className={s.activity}><span className={s.activityIcon} aria-hidden="true"><Icon name="briefcase" /></span>{principal.description}</span>}
    </div>

    <div className={s.meta}>
      <span className={s.document}>{formatTaxDocument(registration.taxId)}</span>
      {local && <span className={s.muted}>{local}</span>}
      {registration.openedOn && <span className={s.muted}>Aberta em {dataCurta(registration.openedOn)}</span>}
    </div>

    {onExpand && <button type="button" className={s.expand} onClick={onExpand}>
      Ver cadastro completo
      <span className={s.chevron} aria-hidden="true"><Icon name="right" /></span>
    </button>}
  </div>;
}

/**
 * «ATIVA» é a única situação boa. «SUSPENSA» e «INAPTA» pedem atenção mas a
 * empresa existe; «BAIXADA» e «NULA» são o fim dela. Três tons, porque tratar
 * tudo o que não é ativa como igual esconderia a diferença entre uma pendência
 * e uma empresa que não existe mais.
 */
function situationTone(situacao: string | null): "success" | "warning" | "danger" | "neutral" {
  if (situacao === null) return "neutral";
  const normalizada = situacao.toUpperCase();
  if (normalizada.startsWith("ATIVA")) return "success";
  if (normalizada.startsWith("SUSPENSA") || normalizada.startsWith("INAPTA")) return "warning";
  if (normalizada.startsWith("BAIXADA") || normalizada.startsWith("NULA")) return "danger";
  return "neutral";
}

/** «1966-08-01» → «01/08/1966». Por texto, nunca por `new Date`: o valor é um
 * dia civil, e convertê-lo trataria como meia-noite UTC e exibiria a véspera. */
function dataCurta(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : dia;
}
