import { createZodDto } from "nestjs-zod";
import { AdminAuditLogSchema, AdminUserSchema, AssignUserToPermissionGroupInputSchema, CreatePermissionGroupInputSchema, CreateTeamInputSchema, CurrentUserSchema, InviteUserInputSchema, PermissionGroupSchema, ReplaceTeamMembersInputSchema, ReplaceUserPermissionGroupInputSchema, SetTeamArchivedInputSchema, TeamSchema, UpdatePermissionGroupInputSchema, UpdateTeamInputSchema, UpdateUserAccessInputSchema, UserSchema } from "@spark/core";

/**
 * DTO generated from packages/core's Zod schema — no field hand-written
 * here (docs/adr/0004, docs/adr/0019). `createZodDto` gives NestJS the
 * same class to validate with AND @nestjs/swagger to document with — both
 * born from the same schema, never defined twice.
 */
export class UserDto extends createZodDto(UserSchema) {}
export class CurrentUserDto extends createZodDto(CurrentUserSchema) {}
export class AdminUserDto extends createZodDto(AdminUserSchema) {}
export class InviteUserDto extends createZodDto(InviteUserInputSchema) {}
export class PermissionGroupDto extends createZodDto(PermissionGroupSchema) {}
export class CreatePermissionGroupDto extends createZodDto(CreatePermissionGroupInputSchema) {}
export class UpdatePermissionGroupDto extends createZodDto(UpdatePermissionGroupInputSchema) {}
export class AssignUserToPermissionGroupDto extends createZodDto(AssignUserToPermissionGroupInputSchema) {}
export class UpdateUserAccessDto extends createZodDto(UpdateUserAccessInputSchema) {}
export class ReplaceUserPermissionGroupDto extends createZodDto(ReplaceUserPermissionGroupInputSchema) {}
export class AdminAuditLogDto extends createZodDto(AdminAuditLogSchema) {}
export class TeamDto extends createZodDto(TeamSchema) {}
export class CreateTeamDto extends createZodDto(CreateTeamInputSchema) {}
export class UpdateTeamDto extends createZodDto(UpdateTeamInputSchema) {}
export class ReplaceTeamMembersDto extends createZodDto(ReplaceTeamMembersInputSchema) {}
export class SetTeamArchivedDto extends createZodDto(SetTeamArchivedInputSchema) {}
