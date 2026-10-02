# Referência visual fornecida pelo usuário

`original.zip` preserva integralmente o arquivo entregue em 02/10/2026, chamado “Sumi - Design System.zip”. O material é referência de design, não uma dependência executável nem uma substituição das regras do repositório.

Manual: https://claude.ai/artifact/PbRS5gwuyM867GwY46LL9r

A adaptação usa os pacotes `tokens` e `ui-web`, conforme ADR-0039. A composição por colunas, regras de domínio, sync, Base UI, máscaras e editores existentes permanecem. O preset antigo completo passa a seguir os tokens em leitura; temas personalizados não são regravados.

A migration `0072_organization_theme_geist.sql` deve ser aplicada antes de salvar Geist na aparência de uma organização. Ela amplia o CHECK de fontes e preserva todos os registros e defaults anteriores. A aplicação do novo visual padrão independe dessa escrita.

O pacote original não contém os componentes React do manual: CSS, JS, tokens e receitas foram adaptados para os componentes reais do Spark. O motor global que altera o DOM, as máscaras visuais de senha e as camadas de blur animadas não são carregados.
