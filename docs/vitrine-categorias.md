# Produtos ao abrir uma categoria

A seleção agora abre uma vitrine e carrega produtos automaticamente quando já há município ou localização escolhida. Sem local, a tela pede esse dado, sem supor GPS ou município. A categoria continua fora da página inicial.

A API documentada exige uma descrição para acompanhar o GPC. Por isso a vitrine pesquisa três tipos comuns de produto por categoria. Ela não representa todo o catálogo nem garante estoque. A lista inicial de termos fica em `src/lib/categories/catalog.ts` e pode ser ajustada sem alterar o fluxo da API. O campo Buscar outro produto permite consultas de outros nomes na mesma categoria.

## Cache e limites

- Cache do navegador só em memória, com chave formada por categoria, município ou GPS e raio, período, termos e modo demonstração. Respostas recentes são reutilizadas por dois minutos; consultas sem uso são eliminadas após cinco minutos. Requisições simultâneas da mesma chave são reunidas pelo TanStack Query.
- Cache já existente no servidor continua por cinco minutos por requisição exata, limitado a 300 entradas por isolate. Não foi criado banco, bucket, cron ou novo recurso da Cloudflare.
- Cada abertura faz no máximo três buscas paralelas de 50 registros. Mais páginas são solicitadas explicitamente e somente para os termos ainda não esgotados. O limite é de três páginas por termo (até 450 registros antes da remoção de duplicados).
- Alterações rápidas de local/período são agrupadas por 400 ms. Não há pré-carregamento de todas as categorias, consultas por letra digitada, retentativas adicionais do cliente nem cache no service worker.

Os dados da origem são filtrados novamente pelo GPC exato e IDs repetidos são eliminados. A ordenação de preços considera apenas registros carregados, com descrição/unidade/embalagem disponíveis nos cartões. Não identifica automaticamente equivalência entre produtos.

Falhas em uma das consultas não descartam os registros das outras; o usuário recebe aviso de lista parcial e pode Atualizar. A data apresentada é a mais antiga entre as respostas da vitrine. Atualizar pode ainda aproveitar o cache válido do servidor, preservando a data original da consulta à SEFAZ. Consultas canceladas não atualizam uma categoria diferente.

## Demonstração e verificações

O gerador demonstrativo passou a respeitar o GPC solicitado e continua identificado como fictício. Testes cobrem catálogo, filtros, limites, cancelamento, paginação vazia, falhas parciais, cache ao voltar, isolamento por categoria/modo e agrupamento de filtros. A integração real depende da disponibilidade e dos dados da SEFAZ; não foi consultada com dados reais nesta entrega.

## Navegação e carregamento

O local e o período são escolhidos logo na entrada da área de categorias, antes da seleção de um cartão. A solicitação de GPS continua explícita pelo botão Usar minha localização. O mesmo local é usado na vitrine, sem duplicar os controles.

A categoria selecionada fica no parâmetro `categoria` da URL. O menu Categorias aponta à rota sem esse parâmetro e sempre retorna à grade; o botão Todas as categorias tem o mesmo efeito. Links diretos e o histórico do navegador preservam a seleção indicada na URL.

Os ícones da grade agora são vetoriais Lucide, com cor, espessura, tamanho e fundo padronizados. O carregamento inicial mostra quatro cartões skeleton; a paginação acrescenta dois skeletons após os produtos já exibidos. Os avisos de carregamento ficam disponíveis aos leitores de tela e a animação respeita movimento reduzido. Atualizações em segundo plano preservam os cartões e indicam Atualizando no botão.

## Correção de localização e classificação (07/11/2026)

Sem local válido, somente a etapa de localização é exibida: a grade e a vitrine ficam indisponíveis, inclusive em links diretos para uma categoria. A validação reaproveita as mesmas regras do formulário e do servidor. Permissão de GPS negada mantém essa etapa aberta para seleção manual de município.

Os 38 nomes/códigos foram conferidos com listarCategoriasGpc do Economiza Alagoas MCP, que reproduz o Anexo III do manual, e os nomes foram atualizados para os oficiais. Animais Vivos é um segmento real (89000000); o fato de uma descrição conter o nome de um animal não o classifica nesse segmento.

A vitrine exige GPC correspondente e GTIN válido em formato. Para Animais Vivos há uma guarda adicional conservadora: só aceitar registros com NCM de oito dígitos no capítulo 01 ou na posição 0301. Sem essa evidência, o registro é ocultado, mesmo se trouxer GPC 89000000. Descrições com contradições explícitas (como travessa, tempero, miojo, ração ou filé) também são rejeitadas, sem atribuir outra categoria ao produto. Essa guarda pode omitir registros válidos incompletos; não tenta reconstruir classificação por nome nem corrigir os dados fiscais da origem. Os termos iniciais genéricos peixe/ave/galinha foram substituídos por termos explícitos de animais vivos.

Os exemplos TRAVESSA INOX PEIXE, TEMPERO PARA FRANGO e MIOJO NISSIN GALINHA CAIPIRA estão cobertos por regressão, inclusive com GPC incorreto na resposta. A chave do cache da vitrine foi versionada para que resultados da versão anterior não sejam reapresentados; respostas ainda em cache no proxy passam novamente pela classificação.

Referências de NCM: capítulo 01 (Animais vivos) em https://www.ibama.gov.br/component/legislacao/?legislacao=139490&view=legislacao e posição 0301 (Peixes vivos) em https://www.gov.br/siscomex/pt-br/noticias/noticias-siscomex-importacao/Comunicados/importacao-no-2026-062 . Não são usadas para cálculo de impostos.

## Exibir somente categorias com produtos (07/11/2026)

A grade passou a depender de uma verificação de produtos para o local, período e modo de dados atuais. Categorias sem registros confirmados não são exibidas. Uma falha na consulta é tratada como falha de verificação, sem afirmar que não há produtos.

A API não tem um endpoint documentado de disponibilidade de todas as categorias. A descoberta começa com doze categorias comuns e permite Verificar mais categorias. Cada lote faz no máximo quatro consultas simultâneas e tenta os três termos iniciais de cada segmento até encontrar um produto compatível. Não percorre todas as páginas da API para provar ausência: a grade representa categorias com produtos encontrados nas amostras verificadas. Uma categoria pode ter produtos fora dos termos ou páginas consultados e ainda não aparecer.

Os produtos confirmados alimentam o mesmo cache da vitrine, de modo que clicar no cartão não repete a consulta inicial. O cache de disponibilidade também é separado por local, período e demonstração, com dois minutos de validade e cinco minutos sem uso antes da coleta. Mais categorias são verificadas somente por ação explícita, preservando o limite de requisições existente no proxy. Falhas são informadas e podem ser tentadas novamente.


## Grade e descoberta progressiva

Skeletons e categorias confirmadas agora são irmãos dentro da mesma grade, com as mesmas dimensões mínimas e espaçamento. Os skeletons são acrescentados após os cartões existentes. A grade usa duas colunas no celular, três em telas médias e até quatro no desktop. Os nomes oficiais são exibidos por inteiro, com quebra de linha inclusive em sequências longas sem espaços (barras/hífens), e os ícones ficam alinhados no topo dos cartões.

A descoberta verifica até doze categorias por lote, com quatro consultas simultâneas. A primeira categoria confirmada pode ser exibida enquanto outras ainda estão pendentes, sem esperar a resposta do lote inteiro. Os produtos já são colocados no cache da vitrine nesse momento. Categorias existentes permanecem antes das novas durante a paginação. O teste de progressão mantém uma das fontes pendente e verifica que os cartões confirmados e os skeletons coexistem na mesma grade.
