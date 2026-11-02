# Interface e busca unificada

Aplique depois de `voz-natural.patch`:

```bash
git am --3way /caminho/interface-unificada.patch
```

A identidade usa verde-petróleo, amarelo-manga e fundo creme. A pesquisa de produtos e combustíveis fica na página inicial, com seletor de tipo. O botão “Buscar por voz” acompanha o tipo escolhido; a navegação móvel também destaca o assistente.

- `/` ou `/?tipo=produto`: produtos, por nome ou código de barras.
- `/?tipo=combustivel`: combustíveis, com os filtros e calculadora existentes.
- `/combustiveis`: redirecionamento para a busca de combustíveis, preservando links antigos.
- Favoritos: Todos, Produtos e Combustíveis, sem remover itens ao filtrar.
- Lista e comparação continuam distintas porque resolvem tarefas diferentes.

Na troca manual de tipo, localização e período acompanham a seleção. Termo, tipo de combustível, CNPJ e demais filtros específicos permanecem em seus próprios formulários. A troca não faz consultas. Favoritos continuam carregando seus próprios filtros e executando a pesquisa solicitada. O botão Pesquisar fica visível e apresenta validação quando faltam dados.

Localização/período e seletor de tipo são componentes compartilhados. Formulários específicos são painéis internos da mesma busca. Respostas de consultas abandonadas não alteram o estado ao trocar o painel; paginação permanece disponível mesmo se a página anterior não trouxe correspondências locais.

Nenhuma dependência nova, alteração de credenciais, configuração de build ou implantação. Nenhum dado salvo precisa ser migrado. O microfone continua exigindo ação explícita.

## Validação em 02/11/2026

143 testes passaram, TypeScript e build aprovados. Lint dos componentes novos e pontos principais alterados sem erros ou avisos. Testes de integração cobrem alternância, consulta ao endpoint correto, filtros compartilhados, preservação do favorito pendente e cancelamento durante paginação. Revisão independente encontrou um caso de paginação vazia, corrigido com teste RED→GREEN.

Servidor de produção local: início, favoritos, lista, comparação e assistente HTTP 200; rota antiga redireciona corretamente. Contraste calculado para os pares principais: branco/verde 6,98:1, texto escuro/amarelo 7,57:1, texto secundário/creme 5,77:1 e branco/verde mais claro do hero 5,05:1. Não constitui auditoria completa de acessibilidade.

Limite: não foi possível instalar o navegador de testes neste ambiente. Layout visual, navegação real por teclado/leitor de tela e comportamento no celular precisam ser conferidos antes da publicação. Conferir especialmente 320 px, zoom de 200%, menus móveis, troca de tipo, favoritos e retorno do assistente. Nenhuma publicação foi feita.
