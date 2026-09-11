# Campos formatados

`MaskedInput` recebe máscara (`#` representa dígito), valor sem pontuação e callback. Usa react-number-format para edição e posição do cursor. Máscara não substitui validação de domínio.

`MoneyInput` recebe e devolve `Money | null` do core. BRL e USD usam duas casas; o valor não carrega a moeda. Não use o seletor de moeda como conversão cambial. Conversão do texto para centavos usa inteiros e rejeita valores além de Number.MAX_SAFE_INTEGER. Vazio e zero são distintos. Moedas com zero ou três casas ainda exigem generalização do contrato de Money.

`PhoneInput` recebe países com ID, DDI e máscara, e devolve um rascunho com país e número nacional sem pontuação. Trocar país limpa o número para não reinterpretar um telefone antigo. O consumidor precisa validar e normalizar no domínio antes de salvar; o validador atual do core cobre somente Brasil. Máscaras internacionais não afirmam validade do número.

O modelo de negócios já usa bigint para amount, mas ainda não tem código de moeda por valor. O driver usa number: portanto o limite exato na aplicação é o inteiro seguro de JavaScript, inferior ao limite de bigint do Postgres. Suporte monetário multimoeda completo requer um contrato com moeda e escala, além da migração correspondente. Nenhuma mudança no banco foi executada nesta entrega.
