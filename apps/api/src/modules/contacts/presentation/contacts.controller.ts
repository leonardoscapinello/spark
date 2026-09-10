import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { SupabaseJwtGuard, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateContactUseCase } from "../application/create-contact.usecase.js";
import { CreateContactDto, CreateContactResponseDto } from "../dto/contact.dto.js";

@ApiTags("contacts")
@Controller("v1/contacts")
export class ContactsController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createContact: CreateContactUseCase,
  ) {}

  @Post()
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateContactResponseDto })
  async create(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreateContactDto,
  ): Promise<CreateContactResponseDto> {
    const usuario = await this.getCurrentUser.execute(claims.sub);
    const resultado = await this.createContact.execute(usuario.orgId, body);

    // txid no corpo, não em header — é o formato que o onInsert do
    // TanStack DB espera de volta (`return { txid: response.txid }`) pra
    // esperar o Electric confirmar a escrita antes de soltar o estado
    // otimista (docs/adr/0018, packages/data).
    return resultado as CreateContactResponseDto;
  }
}
