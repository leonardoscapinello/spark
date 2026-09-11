# Intercom — medidas e referência visual

Objetivo: registrar valores observáveis suficientes para reconstruir os componentes, evitando depender só de uma impressão estética. A coleta não equivale a uma auditoria pixel a pixel concluída; faltam estados de hover/foco/erro e medições de algumas superfícies.

## Medidas coletadas

Os arquivos locais `medidas-inbox.json` e `medidas-tabela.json` contêm amostras de elementos interativos com rótulo, retângulo, fonte, cor, fundo, raio, sombra, padding e gap. Ambas as amostras apresentam o mesmo conjunto agregado; não são evidência independente da geometria de todas as linhas da tabela.

| Propriedade | Valor computado observado | Escopo |
| --- | --- | --- |
| Família | Inter, com fallback system-ui e fontes do sistema | 38 elementos interativos por amostra |
| Texto principal | 14 px; frequentemente linha de 20 px | 31 elementos |
| Texto menor | 13 px; linha de 16 px em parte dos casos | 7 elementos |
| Texto escuro | rgb(26,26,26), `#1a1a1a` | 37 elementos |
| Texto claro | rgb(250,250,247), `#fafaf7` | 1 elemento |
| Botão escuro | rgb(34,34,34), `#222222` | Fundo observado |
| Fundo sutil | rgb(248,248,247), `#f8f8f7` | Fundo observado |
| Raio de controle | 8 px | 18 elementos |
| Pill | 9999 px | 8 elementos |
| Sombra de controle | `0 1px 4px rgba(20,20,20,.15)` | 4 elementos com camadas transparentes adicionais |
| Contorno por sombra | `0 0 0 1px #e9eae6` + sombra anterior | 1 elemento |

Elementos transparentes herdam visualmente o fundo ancestral; não usar `rgba(0,0,0,0)` como cor da tela. Frequência de valor não torna o valor um token oficial. Retângulos refletem aquele viewport e seleção.

## Anatomia a preservar

- Rail de módulos estreito e navegação secundária com ícone, nome e contador.
- Superfícies claras, borda discreta e sombra curta; o conteúdo permanece sólido.
- Seleção da conversa visível sem acentuar cada linha com cores fortes.
- Separação entre lista, leitura da conversa e ficha do contato; painel de detalhes recolhível/configurável.
- Cabeçalho compacto com ações por ícone e detalhes sob demanda em popover.
- Botão primário escuro; ações contextuais pequenas, com distinção de disabled.
- Editor de comentário interno amarelo, separado semanticamente da resposta externa.
- Tabela com pouco ruído vertical, cabeçalhos estáveis e colunas configuráveis; seleção não exige abandonar a tabela.

## Estados a especificar por componente

| Componente | Evidência disponível | Falta para paridade visual |
| --- | --- | --- |
| Item de navegação | Normal/selecionado, contadores | Hover sistemático, foco e overflow |
| Linha de conversa | Lista e seleção | Não lida real, erro, múltipla seleção e carregamento |
| Compositor | Resposta, comentário, botão desabilitado | Anexo, gravação, falha, envio e foco por teclado |
| Popover | Atribuição, adiar, mais ações, coluna | Dimensões em outros viewports e posicionamento nos limites |
| Modal | Nova visualização e filtro | Erro de validação, conteúdo muito longo, mobile |
| Tabela | Cabeçalhos, rolagem horizontal, drawer | Sorting por coluna, resize, reorder e seleção em massa |
| Widget | Configuração e prévia | Instalação real, identidade, sessão móvel e offline |

A tipografia e as cores do editor de **template de e-mail** (I038) não são medidas da interface de atendimento. As cores de configuração do widget também são personalização do canal, não necessariamente a paleta do produto Intercom.

## Aplicação ao Spark

ADR-0031 define a identidade vigente com COLORsoft e FH Duo. Esta pesquisa guarda a fonte Inter como fato observado, sem substituir silenciosamente o ADR. A implementação deverá mapear as medidas aprovadas para tokens e componentes do Spark; uma divergência intencional de identidade precisa ser explicitada. O canvas de automação tem precedência própria: usar a linguagem visual do ManyChat conforme orientação mais recente do usuário.

## Geometria confirmada dos três painéis

Coleta adicional no DOM renderizado, incluindo o Shadow DOM aberto de `teammate-app-react`. As amostras iniciais não atravessavam esse componente e por isso mediam sobretudo a navegação. O arquivo local `medidas-inbox-shadow-dom.json` registra os elementos internos, excluindo ancestrais com display none, visibility hidden ou opacity zero.

Viewport desktop: **1800 × 921 CSS px**, DPR 2. Posição vertical dos módulos: y=66; altura=847; vão entre módulos=8 px.

| Superfície | x | Largura | Fundo | Raio |
| --- | --- | --- | --- | --- |
| Navegação de caixas | 44 | 236 | `#fbfbf9` | 16 px |
| Lista de conversas | 288 | 369 | `#fbfbf9` | 16 px |
| Conversa | 665 | 663,40625 | `#ffffff` | 16 px |
| Detalhes | 1336,40625 | 447,59375 | `#ffffff` | 16 px no invólucro |

Essas superfícies usam sombra efetiva `0 1px 4px rgba(20,20,20,.15)`. A propriedade border computada tem largura **0 px**, apesar da cor de borda definida; não converter automaticamente a borda percebida em CSS border de 1 px. O contorno visual é produzido pela combinação de sombra e contraste. O elemento `aside` interno de detalhes tem raio próprio `0 7px 7px 0`; a forma externa vem do invólucro de 16 px.

Os valores fracionários de largura vêm do layout naquele tamanho e configuração, não devem virar constantes de aplicação. O alvo é a proporção e o comportamento de resize. Os SVGs da navegação externa são majoritariamente 16 × 16 px; isso não comprova tamanho único de todos os ícones internos.

## Responsividade registrada

I057: iPad Pro, viewport 1024 × 1366, DPR 2. I058: iPhone 16 Pro Max, viewport 440 × 956, DPR 3. Os arquivos de medidas registram o viewport efetivo, não apenas a escolha do emulador. A interface mantém conteúdo de múltiplas colunas e exige atenção à área disponível; não foi validada uma jornada móvel completa nem o aplicativo nativo Intercom.

Os arquivos `medidas-*-detalhadas` da primeira amostragem podem incluir elementos geometricamente presentes mas ocultos; não usar, por exemplo, as medidas da paleta invisível como prova do estado aberto. Preferir a coleta visível e a captura do componente aberto correspondente.
