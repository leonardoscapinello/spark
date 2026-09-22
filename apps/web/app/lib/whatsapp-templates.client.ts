import { createWhatsAppTemplatesCollection, type WhatsAppTemplatesCollection } from "@spark/data";
let templates: WhatsAppTemplatesCollection | undefined;
export function getWhatsAppTemplatesCollection(): WhatsAppTemplatesCollection { templates ??= createWhatsAppTemplatesCollection(); return templates; }
