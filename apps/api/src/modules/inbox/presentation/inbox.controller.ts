import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { conversationId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { AddInternalNoteUseCase } from "../application/add-internal-note.usecase.js";
import { CreateConversationUseCase } from "../application/create-conversation.usecase.js";
import { UpdateConversationUseCase } from "../application/update-conversation.usecase.js";
import { AddInternalNoteDto, ConversationWriteResponseDto, CreateConversationDto, MessageWriteResponseDto, UpdateConversationDto } from "../dto/inbox.dto.js";

@ApiTags("inbox")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@Controller("v1/inbox/conversations")
export class InboxController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly createConversation: CreateConversationUseCase, private readonly updateConversation: UpdateConversationUseCase, private readonly addInternalNote: AddInternalNoteUseCase) {}

  @Post()
  @RequireCapability("inbox:write")
  @ApiCreatedResponse({ type: ConversationWriteResponseDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateConversationDto): Promise<ConversationWriteResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.createConversation.execute(user.orgId, user.id, body) as Promise<ConversationWriteResponseDto>;
  }

  @Patch(":id")
  @RequireCapability("inbox:write")
  @ApiOkResponse({ type: ConversationWriteResponseDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateConversationDto): Promise<ConversationWriteResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.updateConversation.execute(user.orgId, user.id, conversationId.from(id), body) as Promise<ConversationWriteResponseDto>;
  }

  @Post(":id/notes")
  @RequireCapability("inbox:write")
  @ApiCreatedResponse({ type: MessageWriteResponseDto })
  async note(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: AddInternalNoteDto): Promise<MessageWriteResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.addInternalNote.execute(user.orgId, user.id, conversationId.from(id), body) as Promise<MessageWriteResponseDto>;
  }
}
