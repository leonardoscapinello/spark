import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { noteId as noteIdFactory } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateNoteDto, NoteWriteResponseDto, UpdateNoteDto } from "../dto/note.dto.js";
import { NotesRepository } from "../infrastructure/notes.repository.js";

@ApiTags("notes")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("contacts:read")
@Controller("v1/notes")
export class NotesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly notes: NotesRepository,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: NoteWriteResponseDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateNoteDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.notes.create(user.orgId, user.id, body) as Promise<NoteWriteResponseDto>;
  }

  @Patch(":id")
  @ApiOkResponse({ type: NoteWriteResponseDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateNoteDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.notes.update(user.orgId, noteIdFactory.from(id), user.id, body) as Promise<NoteWriteResponseDto>;
  }

  @Delete(":id")
  @ApiOkResponse({ type: NoteWriteResponseDto })
  async remove(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.notes.remove(user.orgId, noteIdFactory.from(id), user.id) as Promise<NoteWriteResponseDto>;
  }
}
