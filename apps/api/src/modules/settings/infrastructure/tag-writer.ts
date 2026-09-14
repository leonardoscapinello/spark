import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { companyTags, contactTags, productTags, tags, type SparkDb } from "@spark/db";
import { normalizeTagNames, tagDisplayName, tagSlug, type OrgId } from "@spark/core";

/** Onde o vínculo de cada entidade marcável mora. */
export type TaggableEntity = "contact" | "company" | "product";

/**
 * Grava as marcações de um registro nas tabelas de vínculo (ADR-0035).
 *
 * Roda **dentro da transação de quem salvou o registro**, como o
 * `CustomFieldWriter`, para que o catálogo, o vínculo e a coluna `tags` (ainda
 * presente enquanto a migração termina) nunca fiquem em desacordo.
 *
 * Uma escrita substitui a lista inteira: apaga os vínculos e insere os que
 * vieram. Marcação que ainda não existe no catálogo é criada — é assim que a
 * tela deixa digitar um nome novo sem um passo de cadastro antes.
 */
@Injectable()
export class TagWriter {
  async write(tx: SparkDb, orgId: OrgId, entity: TaggableEntity, entityId: string, names: readonly string[]): Promise<void> {
    const wanted = normalizeTagNames(names);
    const tagIds = wanted.length === 0 ? [] : await this.resolveTagIds(tx, orgId, wanted);

    if (entity === "contact") {
      await tx.delete(contactTags).where(eq(contactTags.contactId, entityId));
      if (tagIds.length > 0) {
        await tx.insert(contactTags).values(tagIds.map((tagId) => ({ orgId, contactId: entityId, tagId }))).onConflictDoNothing();
      }
      return;
    }
    if (entity === "company") {
      await tx.delete(companyTags).where(eq(companyTags.companyId, entityId));
      if (tagIds.length > 0) {
        await tx.insert(companyTags).values(tagIds.map((tagId) => ({ orgId, companyId: entityId, tagId }))).onConflictDoNothing();
      }
      return;
    }
    await tx.delete(productTags).where(eq(productTags.productId, entityId));
    if (tagIds.length > 0) {
      await tx.insert(productTags).values(tagIds.map((tagId) => ({ orgId, productId: entityId, tagId }))).onConflictDoNothing();
    }
  }

  /**
   * Nome → id no catálogo da organização, criando o que falta. O `slug` é a
   * chave da comparação, então «VIP» encontra a marcação gravada como «vip»
   * em vez de criar uma segunda.
   */
  private async resolveTagIds(tx: SparkDb, orgId: OrgId, names: readonly string[]): Promise<string[]> {
    const slugs = names.map(tagSlug);
    const existing = await tx.select({ id: tags.id, slug: tags.slug }).from(tags)
      .where(and(eq(tags.orgId, orgId), inArray(tags.slug, slugs)));
    const idBySlug = new Map(existing.map((row) => [row.slug, row.id]));

    const missing = names.filter((name) => !idBySlug.has(tagSlug(name)));
    if (missing.length > 0) {
      const created = await tx.insert(tags)
        .values(missing.map((name) => ({ orgId, name: tagDisplayName(name), slug: tagSlug(name) })))
        .onConflictDoNothing()
        .returning({ id: tags.id, slug: tags.slug });
      for (const row of created) idBySlug.set(row.slug, row.id);

      // `onConflictDoNothing` não devolve linha para o que já existia — pode
      // ter sido criado por outra transação entre o SELECT e o INSERT. Busca
      // de novo só o que continuou faltando.
      const stillMissing = missing.map(tagSlug).filter((slug) => !idBySlug.has(slug));
      if (stillMissing.length > 0) {
        const found = await tx.select({ id: tags.id, slug: tags.slug }).from(tags)
          .where(and(eq(tags.orgId, orgId), inArray(tags.slug, stillMissing)));
        for (const row of found) idBySlug.set(row.slug, row.id);
      }
    }

    return slugs.map((slug) => idBySlug.get(slug)).filter((id): id is string => id !== undefined);
  }
}
