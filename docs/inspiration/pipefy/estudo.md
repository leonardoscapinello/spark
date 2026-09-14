# Pipefy — o que vale copiar

Estudo feito na conta real do Leonardo (pipe «[PT-BR] P2P AI Studio»,
card #1436881435), em 14/09/2026. Não é para virar cópia visual: é para
entender as decisões de interação que eles acertaram e que a nossa tela de
negócio ainda não tem.

## 1. O card abre em modal de três colunas

Clicar num card do Kanban abre um modal largo, não uma página. As três colunas
têm papéis diferentes, e é isso que faz o modal caber:

| Coluna | Largura | O que carrega |
|---|---|---|
| Esquerda | ~490px | identidade do card, abas em pastilha, o formulário inicial, histórico |
| Meio | ~470px | a **fase atual** e só os campos daquela fase |
| Direita | ~230px | «Mover card para fase» e ações do card |

A separação resolve o problema que a nossa tela tem hoje: o painel único fica
estreito demais e todo campo quebra em duas linhas. Aqui o formulário tem a
coluna larga, e o que é decisão de processo fica isolado à direita.

## 2. Mover card mostra só o que dá para fazer

A coluna da direita lista **apenas as fases alcançáveis**, e separa as duas
direções:

- **Para frente**: pastilha preenchida na cor da fase, com seta para a direita.
  No card visto: «Cotação (RFQ)» e «Arquivado».
- **Para trás**: botão de contorno, com seta para a **esquerda**. No card:
  «Aprovação».

Um traço separa os dois grupos. Não há lista de todas as fases nem seletor:
o que não é permitido simplesmente não aparece. É mais honesto que desabilitar,
e mais rápido de ler.

Abaixo, duas ações de configuração: «Configurar mover cards» e «Mover cards
com IA».

## 3. Campo é ícone + rótulo + valor, e edita no lugar

Cada campo do formulário é uma linha com três partes:

1. um **ícone monocromático pequeno que identifica o TIPO** (texto, e-mail,
   seleção, data, anexo, texto longo, conexão);
2. o rótulo em peso normal;
3. o valor logo abaixo — texto puro quando preenchido, e-mail como link.

Campo vazio mostra **«Clique aqui para adicionar»** com sublinhado tracejado.
É o convite explícito que o nosso lápis em hover tenta fazer de forma tímida
demais.

Nada de botão «Salvar» por campo. Nada de formulário de edição separado.

## 4. Seleção pequena não vira lista suspensa

«Urgência» com duas opções aparece como **rádio em linha**, cada opção com o
seu círculo colorido (🔴 Urgente, 🔵 Normal), mais um link «Limpar opção
selecionada». Abrir um menu para escolher entre dois valores é um clique
desperdiçado.

Vale a regra: até ~4 opções, mostrar todas; acima disso, seletor.

## 5. Registro conectado é um cartãozinho, não um texto

O campo «Centro de custo» com valor «TI» é um cartão com borda: título,
a origem («Database») e a etiqueta colorida do banco de origem
(«Departamentos»), mais um menu ⋯. Deixa claro que aquilo é um **registro de
outro lugar**, não um texto digitado.

É o que a nossa tela deveria fazer com Pessoa e Empresa.

## 6. Abas do card são pastilhas que embrulham

As seções do card («Nova solicitação», «Atividades», «Anexos», «Checklists»,
«Comentários», «Email», «PDF», «Centros de Custo 1», «Fornecedores»,
«Produtos», «Serviços 1») são **pastilhas pequenas com ícone**, que quebram em
várias linhas, com **contador** quando têm conteúdo e um «+» no fim para
adicionar mais.

Ocupa menos altura que uma barra de abas e cabe qualquer quantidade.

## 7. O card do Kanban mostra campos, não um resumo

O card na coluna traz, além do título: uma etiqueta colorida de categoria e
uma lista de **campos escolhidos**, cada um como ícone + rótulo minúsculo em
caixa alta + valor. Vencimento aparece como pastilha colorida
(«Venc set, 21 · em 7 dias»).

E o card é **configurável**: no fim do modal há «Editar visualização do card».

A coluna leva a cor da fase numa linha no topo, o contador ao lado do nome, e
a descrição da fase em cinza no pé da coluna.

## O que isso vira aqui

Em ordem de valor, e nenhum deles exige mudar a nossa identidade visual:

1. **Alargar o painel de detalhes** e parar de empilhar rótulo e campo.
2. **Ícone de tipo por campo** na linha, como o Pipefy.
3. **«Clique aqui para adicionar»** no lugar do lápis em hover para campo vazio.
4. **Seleção curta como rádio**, não como lista suspensa.
5. **Mover etapa mostrando só o que dá**, separando avançar de voltar.
6. **Card do Kanban configurável**, com campos escolhidos pela organização.
7. **Abrir o negócio em modal** a partir do Kanban, com a opção de expandir
   para a página inteira.
