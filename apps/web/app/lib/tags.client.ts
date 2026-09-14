import { useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  createCompanyTagsCollection,
  createContactTagsCollection,
  createProductTagsCollection,
  createTagsCollection,
  type CompanyTagsCollection,
  type ContactTagsCollection,
  type ProductTagsCollection,
  type TagsCollection,
} from "@spark/data";

let tags: TagsCollection | undefined;
let contactLinks: ContactTagsCollection | undefined;
let companyLinks: CompanyTagsCollection | undefined;
let productLinks: ProductTagsCollection | undefined;

export function getTagsCollection(): TagsCollection { tags ??= createTagsCollection(); return tags; }
export function getContactTagsCollection(): ContactTagsCollection { contactLinks ??= createContactTagsCollection(); return contactLinks; }
export function getCompanyTagsCollection(): CompanyTagsCollection { companyLinks ??= createCompanyTagsCollection(); return companyLinks; }
export function getProductTagsCollection(): ProductTagsCollection { productLinks ??= createProductTagsCollection(); return productLinks; }

export type TaggableEntity = "contact" | "company" | "product";

/**
 * As marcações de um registro, montadas localmente a partir do catálogo e da
 * tabela de vínculo (ADR-0035, CLAUDE.md regra 5 — leitura não vai à rede).
 *
 * Devolve os nomes em ordem alfabética, que é o que a tela mostra. Quem
 * precisa da cor lê `useTagCatalog`.
 */
export function useEntityTags(entity: TaggableEntity, entityId: string | undefined): string[] {
  const { data: catalog = [] } = useLiveQuery({ query: (q) => q.from({ tag: getTagsCollection() }) });
  const { data: contactRows = [] } = useLiveQuery({ query: (q) => entity === "contact" ? q.from({ link: getContactTagsCollection() }) : undefined }, [entity]);
  const { data: companyRows = [] } = useLiveQuery({ query: (q) => entity === "company" ? q.from({ link: getCompanyTagsCollection() }) : undefined }, [entity]);
  const { data: productRows = [] } = useLiveQuery({ query: (q) => entity === "product" ? q.from({ link: getProductTagsCollection() }) : undefined }, [entity]);

  return useMemo(() => {
    if (!entityId) return [];
    const nameById = new Map<string, string>(catalog.map((tag) => [tag.id, tag.name]));
    const linked = entity === "contact"
      ? contactRows.filter((row) => row.contactId === entityId).map((row) => row.tagId)
      : entity === "company"
        ? companyRows.filter((row) => row.companyId === entityId).map((row) => row.tagId)
        : productRows.filter((row) => row.productId === entityId).map((row) => row.tagId);

    return linked
      .map((id) => nameById.get(id))
      .filter((name): name is string => name !== undefined)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [entity, entityId, catalog, contactRows, companyRows, productRows]);
}

/** O catálogo ativo da organização — para sugerir ao digitar e para filtrar. */
export function useTagCatalog() {
  const { data = [] } = useLiveQuery({ query: (q) => q.from({ tag: getTagsCollection() }) });
  return useMemo(() => data.filter((tag) => tag.archivedAt === null), [data]);
}

/**
 * As marcações de todos os registros de um tipo: `{ idDoRegistro: [nomes] }`.
 *
 * É o que a lista usa para exibir e filtrar por marcação sem uma consulta por
 * linha — tudo sobre coleção já sincronizada.
 */
export function useTagsByEntity(entity: TaggableEntity): Map<string, string[]> {
  const { data: catalog = [] } = useLiveQuery({ query: (q) => q.from({ tag: getTagsCollection() }) });
  const { data: contactRows = [] } = useLiveQuery({ query: (q) => entity === "contact" ? q.from({ link: getContactTagsCollection() }) : undefined }, [entity]);
  const { data: companyRows = [] } = useLiveQuery({ query: (q) => entity === "company" ? q.from({ link: getCompanyTagsCollection() }) : undefined }, [entity]);
  const { data: productRows = [] } = useLiveQuery({ query: (q) => entity === "product" ? q.from({ link: getProductTagsCollection() }) : undefined }, [entity]);

  return useMemo(() => {
    const nameById = new Map<string, string>(catalog.map((tag) => [tag.id, tag.name]));
    const pairs: Array<[string, string]> = entity === "contact"
      ? contactRows.map((row) => [row.contactId as string, row.tagId as string])
      : entity === "company"
        ? companyRows.map((row) => [row.companyId as string, row.tagId as string])
        : productRows.map((row) => [row.productId as string, row.tagId as string]);

    const byEntity = new Map<string, string[]>();
    for (const [entityId, linkedTagId] of pairs) {
      const name = nameById.get(linkedTagId);
      if (name === undefined) continue;
      const list = byEntity.get(entityId) ?? [];
      list.push(name);
      byEntity.set(entityId, list);
    }
    for (const list of byEntity.values()) list.sort((a, b) => a.localeCompare(b, "pt-BR"));
    return byEntity;
  }, [entity, catalog, contactRows, companyRows, productRows]);
}
