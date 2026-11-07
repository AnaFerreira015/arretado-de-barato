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
