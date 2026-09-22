import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { WidgetRepository } from "../infrastructure/widget.repository.js";
import { SendWidgetMessageDto, StartWidgetConversationDto, WidgetConfigDto, WidgetConversationStateDto } from "../dto/inbox.dto.js";

/**
 * Único caminho de tráfego anônimo do inbox: o site do cliente embute um
 * <iframe> nosso (mesma origem do app, nunca a do cliente — sem CORS pra
 * abrir) que fala com estas rotas. Autorização é o publicKey em si.
 */
@ApiTags("public-widget") @Controller("v1/public/widget")
export class PublicWidgetController {
  constructor(private readonly widget: WidgetRepository) {}

  @Get(":publicKey") @ApiOkResponse({ type: WidgetConfigDto })
  config(@Param("publicKey") publicKey: string): Promise<WidgetConfigDto> { return this.widget.config(publicKey) as Promise<WidgetConfigDto>; }

  @Post(":publicKey/conversations") @ApiCreatedResponse({ type: WidgetConversationStateDto })
  start(@Param("publicKey") publicKey: string, @Body() body: StartWidgetConversationDto): Promise<WidgetConversationStateDto> { return this.widget.start(publicKey, body) as Promise<WidgetConversationStateDto>; }

  @Post(":publicKey/messages") @ApiCreatedResponse({ type: WidgetConversationStateDto })
  send(@Param("publicKey") publicKey: string, @Body() body: SendWidgetMessageDto): Promise<WidgetConversationStateDto> { return this.widget.send(publicKey, body) as Promise<WidgetConversationStateDto>; }

  @Get(":publicKey/messages") @ApiOkResponse({ type: WidgetConversationStateDto })
  poll(@Param("publicKey") publicKey: string, @Query("visitorId") visitorId: string): Promise<WidgetConversationStateDto> { return this.widget.state(publicKey, visitorId) as Promise<WidgetConversationStateDto>; }
}
