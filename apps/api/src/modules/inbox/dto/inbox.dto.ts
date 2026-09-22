import { createZodDto } from "nestjs-zod";
import { AddInternalNoteInputSchema, ArchiveCannedReplyInputSchema, CannedReplyWriteResponseSchema, ConversationSchema, ConversationWriteResponseSchema, CreateCannedReplyInputSchema, CreateConversationInputSchema, MessageSchema, MessageWriteResponseSchema, SendMessageInputSchema, SendWidgetMessageInputSchema, StartWidgetConversationInputSchema, SyncWhatsAppTemplatesResponseSchema, UpdateCannedReplyInputSchema, UpdateConversationInputSchema, WidgetConfigSchema, WidgetConversationStateSchema } from "@spark/core";

export class ConversationDto extends createZodDto(ConversationSchema) {}
export class MessageDto extends createZodDto(MessageSchema) {}
export class CreateConversationDto extends createZodDto(CreateConversationInputSchema) {}
export class UpdateConversationDto extends createZodDto(UpdateConversationInputSchema) {}
export class AddInternalNoteDto extends createZodDto(AddInternalNoteInputSchema) {}
export class SendMessageDto extends createZodDto(SendMessageInputSchema) {}
export class ConversationWriteResponseDto extends createZodDto(ConversationWriteResponseSchema) {}
export class MessageWriteResponseDto extends createZodDto(MessageWriteResponseSchema) {}
export class CreateCannedReplyDto extends createZodDto(CreateCannedReplyInputSchema) {}
export class UpdateCannedReplyDto extends createZodDto(UpdateCannedReplyInputSchema) {}
export class ArchiveCannedReplyDto extends createZodDto(ArchiveCannedReplyInputSchema) {}
export class CannedReplyWriteResponseDto extends createZodDto(CannedReplyWriteResponseSchema) {}
export class SyncWhatsAppTemplatesResponseDto extends createZodDto(SyncWhatsAppTemplatesResponseSchema) {}
export class WidgetConfigDto extends createZodDto(WidgetConfigSchema) {}
export class StartWidgetConversationDto extends createZodDto(StartWidgetConversationInputSchema) {}
export class SendWidgetMessageDto extends createZodDto(SendWidgetMessageInputSchema) {}
export class WidgetConversationStateDto extends createZodDto(WidgetConversationStateSchema) {}
