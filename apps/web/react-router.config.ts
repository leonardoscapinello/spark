import type { Config } from "@react-router/dev/config";

export default {
  // SSR na primeira visita, navegação no cliente depois — é a decisão
  // completa do docs/adr/0015, refinada pelo docs/adr/0018: o SSR passa a
  // servir só a primeira visita em dispositivo novo, porque a partir daí
  // quem entrega velocidade é a coleção local sincronizada (Electric), não
  // o servidor. `false` aqui trocaria isso por SPA puro — não é a decisão.
  ssr: true,
} satisfies Config;
