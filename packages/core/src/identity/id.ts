/**
 * Todo identificador de entidade é UUID v7 — ordenável por tempo, requisito
 * do offline-first (docs/adr/0012, docs/adr/0018-arquitetura-local-first.md).
 * Cada tipo de entidade tem sua própria marca: um OrgId nunca é aceito onde
 * se espera um ContactId, mesmo os dois sendo strings por baixo.
 */
import { v7 as uuidv7, validate as validateUuid, version as uuidVersion } from "uuid";

type Id<Marca extends string> = string & { readonly __id: Marca };

export type OrgId = Id<"Org">;
export type UserId = Id<"User">;
export type ContactId = Id<"Contact">;
export type DealId = Id<"Deal">;
export type PermissionGroupId = Id<"PermissionGroup">;
export type PipelineId = Id<"Pipeline">;
export type StageId = Id<"Stage">;
export type ActivityId = Id<"Activity">;

export class InvalidIdError extends Error {
  constructor(tipo: string, value: string) {
    super(`${tipo} inválido — precisa ser UUID v7: "${value}"`);
    this.name = "InvalidIdError";
  }
}

function makeIdFactory<Marca extends string>(tipo: Marca) {
  return {
    novo: (): Id<Marca> => uuidv7() as Id<Marca>,
    de: (value: string): Id<Marca> => {
      if (!validateUuid(value) || uuidVersion(value) !== 7) {
        throw new InvalidIdError(tipo, value);
      }
      return value as Id<Marca>;
    },
  };
}

// A string passada aqui PRECISA bater com o literal usado no alias de tipo
// acima (Id<"Org">, Id<"User">, ...) — são o mesmo brand, checado pelo tsc.
export const orgId = makeIdFactory("Org");
export const userId = makeIdFactory("User");
export const contactId = makeIdFactory("Contact");
export const dealId = makeIdFactory("Deal");
export const permissionGroupId = makeIdFactory("PermissionGroup");
export const pipelineId = makeIdFactory("Pipeline");
export const stageId = makeIdFactory("Stage");
export const activityId = makeIdFactory("Activity");
