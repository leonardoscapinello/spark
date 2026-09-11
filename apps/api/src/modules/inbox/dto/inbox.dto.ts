import { createZodDto } from "nestjs-zod";
import { AddInternalNoteInputSchema, ConversationSchema, ConversationWriteResponseSchema, CreateConversationInputSchema, MessageSchema, MessageWriteResponseSchema, SendMessageInputSchema, UpdateConversationInputSchema } from "@spark/core";

export class ConversationDto extends createZodDto(ConversationSchema) {}
export class MessageDto extends createZodDto(MessageSchema) {}
export class CreateConversationDto extends createZodDto(CreateConversationInputSchema) {}
export class UpdateConversationDto extends createZodDto(UpdateConversationInputSchema) {}
export class AddInternalNoteDto extends createZodDto(AddInternalNoteInputSchema) {}
export class SendMessageDto extends createZodDto(SendMessageInputSchema) {}
export class ConversationWriteResponseDto extends createZodDto(ConversationWriteResponseSchema) {}
export class MessageWriteResponseDto extends createZodDto(MessageWriteResponseSchema) {}
