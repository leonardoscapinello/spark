import { createContext, useCallback, useContext, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { companyRegistrationsControllerResolve } from "@spark/api-client";
import {
  createCompanyRegistrationActivitiesCollection,
  createCompanyRegistrationMembersCollection,
  createCompanyRegistrationTaxRegimesCollection,
  createCompanyRegistrationsCollection,
  type CompanyRegistrationActivitiesCollection,
  type CompanyRegistrationMembersCollection,
  type CompanyRegistrationTaxRegimesCollection,
  type CompanyRegistrationsCollection,
} from "@spark/data";
import {
  companyRegistrationNeedsRefresh,
  isValidCnpj,
  type CompanyRegistration,
  type CompanyRegistrationActivity,
  type CompanyRegistrationMember,
  type CompanyRegistrationTaxRegime,
} from "@spark/core";
import { CompanyRegistrationCard, CompanyRegistrationDetails, CustomFieldValue, Modal, ModalContent } from "@spark/ui-web";
import { PreviewedCustomFieldValue } from "./link-previews.client";

let registrations: CompanyRegistrationsCollection | undefined;
let activities: CompanyRegistrationActivitiesCollection | undefined;
let members: CompanyRegistrationMembersCollection | undefined;
let taxRegimes: CompanyRegistrationTaxRegimesCollection | undefined;
function getRegistrations() { registrations ??= createCompanyRegistrationsCollection(); return registrations; }
function getActivities() { activities ??= createCompanyRegistrationActivitiesCollection(); return activities; }
function getMembers() { members ??= createCompanyRegistrationMembersCollection(); return members; }
function getTaxRegimes() { taxRegimes ??= createCompanyRegistrationTaxRegimesCollection(); return taxRegimes; }

const inflight = new Map<string, Promise<unknown>>();

export interface CompanyRegistrationState {
  registration: CompanyRegistration | null;
  activities: readonly CompanyRegistrationActivity[];
  members: readonly CompanyRegistrationMember[];
  taxRegimes: readonly CompanyRegistrationTaxRegime[];
  loading: boolean;
}

interface ContextValue {
  byTaxId: ReadonlyMap<string, CompanyRegistration>;
  activitiesById: ReadonlyMap<string, CompanyRegistrationActivity[]>;
  membersById: ReadonlyMap<string, CompanyRegistrationMember[]>;
  regimesById: ReadonlyMap<string, CompanyRegistrationTaxRegime[]>;
  pending: ReadonlySet<string>;
  request: (taxId: string) => void;
}
const CompanyRegistrationContext = createContext<ContextValue | null>(null);

/**
 * Um provedor para toda a aplicação, e não uma consulta por campo: a mesma
 * empresa costuma aparecer em vários lugares da mesma tela, e cada campo
 * abrindo a sua consulta seria a mesma resposta buscada N vezes.
 */
export function CompanyRegistrationDataProvider({ children }: { children: ReactNode }) {
  const { data: registrosSincronizados = [] } = useLiveQuery({ query: (q) => q.from({ registros: getRegistrations() }) });
  const { data: atividades = [] } = useLiveQuery({ query: (q) => q.from({ atividades: getActivities() }) });
  const { data: socios = [] } = useLiveQuery({ query: (q) => q.from({ socios: getMembers() }) });
  const { data: regimes = [] } = useLiveQuery({ query: (q) => q.from({ regimes: getTaxRegimes() }) });
  const [imediatos, setImediatos] = useState<ReadonlyMap<string, CompanyRegistration>>(() => new Map());
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());

  /* A resposta da API entra na tela na hora; o Electric consolida a mesma
   * linha depois. Esperar esse eco prenderia o cartão no «consultando». */
  const byTaxId = useMemo(() => {
    const mapa = new Map<string, CompanyRegistration>(registrosSincronizados.map((registro) => [registro.taxId, registro] as const));
    for (const [taxId, imediato] of imediatos) {
      const sincronizado = mapa.get(taxId);
      if (!sincronizado || new Date(imediato.updatedAt).getTime() >= new Date(sincronizado.updatedAt).getTime()) mapa.set(taxId, imediato);
    }
    return mapa;
  }, [registrosSincronizados, imediatos]);

  const activitiesById = useMemo(() => agrupar(atividades, (item) => item.registrationId, (a, b) => a.sortOrder - b.sortOrder), [atividades]);
  const membersById = useMemo(() => agrupar(socios, (item) => item.registrationId, (a, b) => a.sortOrder - b.sortOrder), [socios]);
  const regimesById = useMemo(() => agrupar(regimes, (item) => item.registrationId, (a, b) => b.year - a.year), [regimes]);

  const request = useCallback((raw: string) => {
    const taxId = raw.replace(/\D/g, "");
    // Só CNPJ tem cadastro público, e um número que não fecha não merece uma
    // ida à rede — a mesma conferência que o servidor faria, feita antes.
    if (taxId.length !== 14 || !isValidCnpj(taxId)) return;
    const atual = byTaxId.get(taxId);
    if ((atual && !companyRegistrationNeedsRefresh(atual)) || inflight.has(taxId)) return;

    setPending((itens) => { if (itens.has(taxId)) return itens; const proximo = new Set(itens); proximo.add(taxId); return proximo; });
    const operacao = companyRegistrationsControllerResolve({ taxId, refresh: false })
      .then(({ registration }) => {
        setImediatos((itens) => { const proximo = new Map(itens); proximo.set(taxId, registration as CompanyRegistration); return proximo; });
      })
      .catch(() => undefined)
      .finally(() => {
        inflight.delete(taxId);
        setPending((itens) => { const proximo = new Set(itens); proximo.delete(taxId); return proximo; });
      });
    inflight.set(taxId, operacao);
  }, [byTaxId]);

  return <CompanyRegistrationContext.Provider value={{ byTaxId, activitiesById, membersById, regimesById, pending, request }}>{children}</CompanyRegistrationContext.Provider>;
}

function agrupar<T>(itens: readonly T[], chave: (item: T) => string, ordem: (a: T, b: T) => number): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const lista = mapa.get(chave(item));
    if (lista) lista.push(item); else mapa.set(chave(item), [item]);
  }
  for (const lista of mapa.values()) lista.sort(ordem);
  return mapa;
}

export function useCompanyRegistration(rawTaxId: string | null | undefined): CompanyRegistrationState & { request: () => void } {
  const contexto = useContext(CompanyRegistrationContext);
  if (!contexto) throw new Error("useCompanyRegistration precisa estar dentro de CompanyRegistrationDataProvider.");
  const taxId = typeof rawTaxId === "string" ? rawTaxId.replace(/\D/g, "") : null;
  const valido = taxId !== null && taxId.length === 14 && isValidCnpj(taxId);
  const registration = valido ? contexto.byTaxId.get(taxId) ?? null : null;
  return {
    registration,
    activities: registration ? contexto.activitiesById.get(registration.id) ?? [] : [],
    members: registration ? contexto.membersById.get(registration.id) ?? [] : [],
    taxRegimes: registration ? contexto.regimesById.get(registration.id) ?? [] : [],
    loading: valido ? contexto.pending.has(taxId) : false,
    request: () => { if (valido && taxId) contexto.request(taxId); },
  };
}

/**
 * Campo personalizado que se enriquece sozinho: endereço web ganha prévia do
 * link, CNPJ ganha o cadastro da Receita. Uma porta só para as telas, porque
 * quem escreve a tela não deveria precisar saber que são dois mecanismos.
 */
export function EnrichedCustomFieldValue(props: ComponentProps<typeof CustomFieldValue>) {
  const taxId = props.field.type === "document" && typeof props.value === "string" ? props.value : null;
  const estado = useCompanyRegistration(taxId);
  const [aberto, setAberto] = useState(false);

  const save = async (value: unknown) => {
    await props.onSave(value);
    /* A consulta começa no ato de gravar o CNPJ. Quando a pessoa passar o
     * mouse, a empresa normalmente já está ali. */
    if (props.field.type === "document" && typeof value === "string") {
      const digitos = value.replace(/\D/g, "");
      if (digitos.length === 14) estado.request();
    }
  };

  if (taxId === null || taxId.replace(/\D/g, "").length !== 14) return <PreviewedCustomFieldValue {...props} onSave={save} />;

  return <>
    <PreviewedCustomFieldValue
      {...props}
      onSave={save}
      preview={<CompanyRegistrationCard
        registration={estado.registration}
        activities={estado.activities}
        loading={estado.loading}
        taxId={taxId}
        onExpand={() => setAberto(true)}
      />}
      onPreviewRequest={estado.request}
    />
    <Modal open={aberto} onOpenChange={setAberto}>
      {estado.registration && <ModalContent
        title={estado.registration.legalName ?? "Cadastro da empresa"}
        description="Cadastro público da Receita Federal"
        size="wide"
      >
        <CompanyRegistrationDetails
          registration={estado.registration}
          activities={estado.activities}
          members={estado.members}
          taxRegimes={estado.taxRegimes}
        />
      </ModalContent>}
    </Modal>
  </>;
}
