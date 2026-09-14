import { createZodDto } from "nestjs-zod";
import { CreateNoteInputSchema, NoteWriteResponseSchema, UpdateNoteInputSchema } from "@spark/core";

export class CreateNoteDto extends createZodDto(CreateNoteInputSchema) {}
export class UpdateNoteDto extends createZodDto(UpdateNoteInputSchema) {}
export class NoteWriteResponseDto extends createZodDto(NoteWriteResponseSchema) {}
