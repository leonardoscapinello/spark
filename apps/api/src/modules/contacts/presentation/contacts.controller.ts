import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { contactId as contactIdFactory } from "@spark/core";
import {
  SupabaseJwtGuard,
  CapabilityGuard,
  RequireCapability,
  CurrentSupabaseUser,
  type SupabaseJwtClaims,
} from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateContactUseCase } from "../application/create-contact.usecase.js";
import { UpdateContactUseCase } from "../application/update-contact.usecase.js";
import { ArchiveContactUseCase } from "../application/archive-contact.usecase.js";
import { AddContactIdentityUseCase } from "../application/add-contact-identity.usecase.js";
import { CreateContactDto, CreateContactResponseDto, UpdateContactArchiveDto, UpdateContactDto, UpdateContactResponseDto } from "../dto/contact.dto.js";
import { AddContactIdentityDto, CreateIdentityResponseDto } from "../dto/identity.dto.js";
import { ImportContactsDto, ImportContactsResponseDto } from "../dto/contact.dto.js";
import { ImportContactsUseCase } from "../application/import-contacts.usecase.js";

@ApiTags("contacts")
@Controller("v1/contacts")
export class ContactsController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createContact: CreateContactUseCase,
    private readonly updateContact: UpdateContactUseCase,
    private readonly archiveContact: ArchiveContactUseCase,
    private readonly addContactIdentity: AddContactIdentityUseCase,
    private readonly importContacts: ImportContactsUseCase,
  ) {}

  @Post("import")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("contacts:write")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ImportContactsResponseDto })
  async importCsv(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: ImportContactsDto,
  ): Promise<ImportContactsResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.importContacts.execute(user.orgId, body) as Promise<ImportContactsResponseDto>;
  }

  @Post(":id/identities")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("contacts:write")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateIdentityResponseDto })
  async addIdentity(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: AddContactIdentityDto,
  ): Promise<CreateIdentityResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.addContactIdentity.execute(user.orgId, contactIdFactory.from(id), body) as Promise<CreateIdentityResponseDto>;
  }

  @Post()
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("contacts:write")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateContactResponseDto })
  async create(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreateContactDto,
  ): Promise<CreateContactResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.createContact.execute(user.orgId, body);

    // txid in the body, not a header — that's the shape TanStack DB's
    // onInsert expects back (`return { txid: response.txid }`) to wait for
    // Electric to confirm the write before releasing the optimistic state
    // (docs/adr/0018, packages/data).
    return result as CreateContactResponseDto;
  }

  @Patch(":id")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("contacts:write")
  @ApiBearerAuth()
  @ApiOkResponse({ type: UpdateContactResponseDto })
  async update(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: UpdateContactDto,
  ): Promise<UpdateContactResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.updateContact.execute(user.orgId, contactIdFactory.from(id), body);
    return result as UpdateContactResponseDto;
  }

  @Patch(":id/archive")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("contacts:write")
  @ApiBearerAuth()
  @ApiOkResponse({ type: UpdateContactResponseDto })
  async archive(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: UpdateContactArchiveDto,
  ): Promise<UpdateContactResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.archiveContact.execute(user.orgId, contactIdFactory.from(id), body.archived);
    return result as UpdateContactResponseDto;
  }
}
