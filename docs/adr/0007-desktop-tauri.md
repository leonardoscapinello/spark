# ADR-0007 — Desktop (macOS e Windows) com Tauri v2

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O produto vai ter app de macOS e Windows. Para um atendente que passa o expediente inteiro dentro da ferramenta, o app nativo entrega três coisas que o navegador não entrega bem: **notificação de sistema confiável**, **atalho global** para abrir a próxima conversa, e **inicialização junto com o sistema**.

O que ele *não* precisa é de uma renderização diferente da web. É o mesmo produto.

## Decisão

**Tauri v2**, empacotando o build de `apps/web` ([ADR-0006](0006-web-spa-vite-tanstack.md)) sem alterações.

- `apps/desktop` é essencialmente uma configuração Tauri e um punhado de comandos Rust — não uma segunda aplicação.
- Rust cobre só o que é nativo: bandeja do sistema, notificações, atalhos globais, *deep link* de OAuth, armazenamento seguro de token (Keychain no macOS, Credential Manager no Windows) e o auto-updater assinado.
- Alvos: macOS (Apple Silicon e Intel), Windows x64. Linux sai de graça e não é alvo oficial.
- O código web detecta o ambiente Tauri e liga os recursos nativos; no navegador, degrada para as APIs web equivalentes.

**Números que sustentam a escolha:** binários de 3–10 MB contra 120–200 MB do Electron, e cerca de 5× menos RAM, porque o Tauri usa o WebView do sistema em vez de embutir um Chromium inteiro. Para uma ferramenta que fica aberta ao lado do navegador, do Slack e do editor, essa diferença de memória é percebida pelo usuário todo dia.

## Alternativas consideradas

**Electron.** Renderização idêntica em todas as plataformas, ecossistema maduro, time só de JavaScript. Descartado por peso: 100+ MB de download e um Chromium por app instalado. O ponto de dor honesto do Tauri — divergência de WebView entre plataformas — é gerenciável para nós, porque o app é uma UI de aplicação, não um site que precisa parecer idêntico em pixel. Vale garantir isso com testes de UI nos dois sistemas.

**PWA instalável.** Custo zero. Descartado: notificação e atalho global no Windows são frágeis, no macOS a instalação é confusa para o usuário, e não há caminho para distribuição corporativa (MDM).

**.NET MAUI / Qt.** Nativo de verdade. Descartado: linguagem a mais, UI a mais, e nenhuma reutilização do trabalho de web ([ADR-0001](0001-typescript-ponta-a-ponta.md)).

## Consequências

- Precisamos de Rust no ambiente de build, e de alguém no time confortável em ler Rust — não escrever muito, mas ler.
- **Assinatura de código é um custo e um processo, não um detalhe.** Apple Developer Program (US$ 99/ano) mais notarização no macOS; certificado de assinatura no Windows (Azure Trusted Signing, ~US$ 120/ano, é hoje a rota mais barata que evita o alerta do SmartScreen). Orçar isso antes do primeiro release.
- Diferenças entre WKWebView (macOS) e WebView2 (Windows) vão aparecer. Testar nos dois é obrigatório na esteira de release.
- O auto-updater do Tauri exige uma chave de assinatura de update guardada com cuidado — vazá-la significa entregar um canal de distribuição de código a um atacante.
