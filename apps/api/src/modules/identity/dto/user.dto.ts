import { createZodDto } from "nestjs-zod";
import { AdminUserSchema, AssignUserToPermissionGroupInputSchema, CreatePermissionGroupInputSchema, InviteUserInputSchema, PermissionGroupSchema, UpdatePermissionGroupInputSchema, UserSchema } from "@spark/core";

/**
 * DTO generated from packages/core's Zod schema — no field hand-written
 * here (docs/adr/0004, docs/adr/0019). `createZodDto` gives NestJS the
 * same class to validate with AND @nestjs/swagger to document with — both
 * born from the same schema, never defined twice.
 */
export class UserDto extends createZodDto(UserSchema) {}
export class AdminUserDto extends createZodDto(AdminUserSchema) {}
export class InviteUserDto extends createZodDto(InviteUserInputSchema) {}
export class PermissionGroupDto extends createZodDto(PermissionGroupSchema) {}
export class CreatePermissionGroupDto extends createZodDto(CreatePermissionGroupInputSchema) {}
export class UpdatePermissionGroupDto extends createZodDto(UpdatePermissionGroupInputSchema) {}
export class AssignUserToPermissionGroupDto extends createZodDto(AssignUserToPermissionGroupInputSchema) {}
