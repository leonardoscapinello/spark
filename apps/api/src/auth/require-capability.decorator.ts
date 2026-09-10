import { SetMetadata } from "@nestjs/common";
import type { Capacidade } from "@spark/core";

export const CAPACIDADE_EXIGIDA_KEY = "capacidadeExigida";

/** Toda rota que muta ou lê dado de negócio declara isto (docs/adr/0029). */
export const RequireCapability = (capacidade: Capacidade): ReturnType<typeof SetMetadata> =>
  SetMetadata(CAPACIDADE_EXIGIDA_KEY, capacidade);
