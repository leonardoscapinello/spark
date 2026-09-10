import { createZodDto } from "nestjs-zod";
import { UserSchema } from "@spark/core";

/**
 * DTO gerado do schema Zod de packages/core — nenhum campo escrito à mão
 * aqui (docs/adr/0004, docs/adr/0019). `createZodDto` dá a mesma classe pro
 * NestJS validar E pro @nestjs/swagger documentar; os dois nascem do mesmo
 * schema, nunca definidos duas vezes.
 */
export class UserDto extends createZodDto(UserSchema) {}
