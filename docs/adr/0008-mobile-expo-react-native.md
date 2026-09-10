# ADR-0008 — Mobile (iOS e Android) com Expo / React Native

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O app móvel não é o app web numa tela menor. Ele tem um propósito distinto e mais estreito:

- Receber **push** de conversa nova ou negócio atribuído — este é o recurso principal, e é o que justifica o app existir.
- Responder uma conversa rapidamente, com câmera, áudio e galeria.
- Consultar a ficha do contato e o pipeline em trânsito.
- Registrar atividade (nota, ligação, tarefa) logo depois de uma reunião.

Ninguém vai desenhar uma automação de marketing no celular. Tentar portar o construtor de fluxo para mobile seria desperdício.

## Decisão

**Expo (SDK atual, New Architecture) com React Native e Expo Router.**

- **New Architecture** (JSI + Fabric, padrão desde o SDK 52 / RN 0.76): sem a ponte assíncrona antiga, com chamadas nativas síncronas e tempo de inicialização próximo do nativo.
- **Expo Router** — roteamento por arquivo, mesmo modelo mental do TanStack Router usado na web.
- **EAS Build** — compilação de iOS na nuvem, sem exigir um Mac por desenvolvedor. **EAS Update** para correções de JS sem passar pela revisão da loja; mudanças nativas continuam exigindo submissão.
- **Push:** `expo-notifications` sobre APNs e FCM. O servidor guarda os tokens por dispositivo e por usuário, com baixa automática de token inválido.
- **Reaproveitamento:** `packages/contracts`, `packages/api-client` e `packages/core` são importados **sem adaptação** — TanStack Query e Zod são agnósticos de plataforma. A UI é própria (`packages/ui-native`), pelo motivo explicado em [ADR-0006](0006-web-spa-vite-tanstack.md).
- **Auth:** Supabase Auth via PKCE com `expo-auth-session`; refresh token no `expo-secure-store` (Keychain/Keystore), nunca em `AsyncStorage`.

Estimativa realista de compartilhamento: **~60–70% da lógica** (tipos, chamadas de API, validação, regras de domínio, i18n), **~0% da UI**. É o número certo a esperar — e é muito melhor do que os 0% de qualquer alternativa fora do TypeScript.

## Alternativas consideradas

**Flutter.** Uma base para iOS, Android, desktop e web. Descartado por [ADR-0001](0001-typescript-ponta-a-ponta.md): Dart não compartilha nenhuma linha com o backend nem com a web, então todas as regras de domínio seriam reimplementadas e mantidas em dobro — para sempre.

**Nativo (Swift + Kotlin).** Melhor resultado possível por plataforma. Descartado: três bases de código de UI e duas linguagens a mais para um time pequeno, com ganho marginal num app cuja tela mais complexa é uma lista de mensagens.

**Tauri v2 Mobile.** Unificaria desktop e mobile num framework só. Descartado por maturidade: mobile no Tauri ainda não tem o histórico de produção que o Expo tem, e o modelo de WebView entrega uma experiência de rolagem e gesto pior justamente na tela que mais importa — a de conversas.

**Capacitor / Ionic empacotando `apps/web`.** Mais barato e rápido. Descartado pela mesma razão: o inbox em WebView tem rolagem, teclado e gesto perceptivelmente piores que RN, e é a tela onde o usuário passa 90% do tempo.

## Consequências

- Duas camadas de UI para manter. Aceito conscientemente: é o custo de ter um app móvel que não parece um site embrulhado.
- Contas de loja e seus prazos entram no cronograma: Apple Developer (US$ 99/ano), Google Play (US$ 25, único). Revisão da App Store leva dias e às vezes reprova — não é etapa para deixar para o fim.
- EAS Build cobra por build acima do plano gratuito. Orçar, ou migrar para runners próprios depois (exige Mac para iOS).
- O app precisa tolerar rede ruim desde a v1 (retry, fila de envio, estado otimista). O offline completo vem depois, em [ADR-0012](0012-offline-first-powersync.md).
- **Escopo do mobile é deliberadamente menor que o da web.** Isso precisa estar claro no roadmap, senão vira pressão para portar tudo.
