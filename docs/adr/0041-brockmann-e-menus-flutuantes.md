# ADR-0041 — Brockmann e menus flutuantes

Status: aceito — 2026-10-02

## Contexto
O usuário forneceu os oito estilos originais Brockmann da marca e pediu sua adoção no painel. Também rejeitou dropdowns com acabamento de cartão e pediu preservar a resposta orgânica do Sumi com baixo custo de renderização.

## Decisão
Brockmann substitui Geist como família padrão da interface e títulos, alterando essa parte da ADR-0039. Geist Mono permanece para dados técnicos. O Regular 400 normal depende do download do iCloud; até lá, o manifesto distribui sete estilos reais e o navegador usa Medium como peso normal mais próximo. Preservamos os OTF disponíveis; WOFF2 é a fonte entregue ao navegador, WOFF é fallback. Cada peso e itálico usa seu desenho real, carregado apenas quando usado, com font-display swap. Não duplicamos downloads com preload de todos os estilos nem convertemos para formatos obsoletos.

Os presets anteriores seguem o padrão novo; personalizações continuam válidas. A migration 0073 amplia a restrição de fontes e deve ser aplicada antes de persistir brockmann na API. A identidade padrão funciona em leitura sem gravar temas existentes.

Menus, selects e seletores de registros usam o primitivo Glass em uma única superfície flutuante, sem textura de papel repetida, padding de 6px e raio de 14px. Blur permanece constante; abertura e fechamento animam transform e opacity. Estados de item e chevron possuem transições curtas, respeitando movimento e transparência reduzidos. A lista pesquisável desmonta quando fechada para não manter opções invisíveis em cada linha.

## Alternativas
Carregar OTF diretamente perde a compressão específica para web. Gerar uma variável interpolada sem fontes mestre altera o desenho da marca. Remover transições para ganhar velocidade contraria o comportamento solicitado; restringimos o custo à superfície visível e aos estados que mudam.
