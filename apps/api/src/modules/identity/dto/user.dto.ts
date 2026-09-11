import { createZodDto } from "nestjs-zod";
import { UserSchema } from "@spark/core";

/**
 * DTO generated from packages/core's Zod schema — no field hand-written
 * here (docs/adr/0004, docs/adr/0019). `createZodDto` gives NestJS the
 * same class to validate with AND @nestjs/swagger to document with — both
 * born from the same schema, never defined twice.
 */
export class UserDto extends createZodDto(UserSchema) {}
