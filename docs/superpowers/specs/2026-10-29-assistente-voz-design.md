# Assistente de busca por voz — desenho para aprovação

Status: desenho aprovado pela usuária em 29/10/2026; implementado na branch `feat/assistente-voz`.

## Intenção e escopo

Acrescentar ao Arretado de Barato uma maneira acessível de pesquisar produtos e ouvir preços, especialmente para pessoas cegas. Preservar busca atual, filtros, favoritos e listas. O novo recurso usa as mesmas consultas e validações da SEFAZ, sem alterar o comportamento do formulário existente.

Objetivos: concluir uma busca guiada sem consumir tokens de LLM; interpretar pedidos mais livres quando houver IA disponível; permitir todo o fluxo por teclado e texto; apresentar somente preços retornados pela API, com data e embalagem.

Não faz parte desta versão: conversa geral, compras, navegação até lojas, busca de combustíveis por voz, escuta permanente, modelo baixado no dispositivo, garantia de disponibilidade da SEFAZ ou garantia de uso ilimitado dos serviços externos. Uma falha seria exigir IA ou microfone para acessar a busca existente, ou apresentar embalagens diferentes como se fossem equivalentes.

## Abordagens consideradas

1. LLM hospedada em todas as interações: compreensão flexível, mas cotas e indisponibilidade bloqueiam o recurso.
2. LLM local no navegador: dispensa cota de fornecedor de inferência, mas exige download, memória e suporte a WebGPU; inadequada como requisito em celulares variados.
3. Abordagem híbrida, escolhida pela usuária: comandos e perguntas guiadas determinísticos; LLM opcional somente para interpretar linguagem mais complexa. O fluxo guiado continua quando a IA não estiver disponível.

As escolhas técnicas abaixo são propostas do implementador, não decisões previamente tomadas pela usuária.

## Experiência adicional

Adicionar um link/botão “Assistente de voz” próximo à busca, abrindo uma rota própria. Voltar à busca não modifica seus campos ou resultados. Manter estado do assistente separado, somente em memória; não guardar gravações nem histórico de transcrições.

Na entrada, oferecer texto e controles acessíveis, com “Ativar respostas faladas” desligado inicialmente para não competir com leitor de tela. Microfone inicia apenas por ação explícita em “Falar”; nunca abre automaticamente. Explicar antes do primeiro uso que o navegador pode enviar áudio ao serviço de reconhecimento dele. Digitação fica disponível mesmo sem suporte a voz ou permissão.

Fluxo guiado:

1. Perguntar qual produto, aceitando descrição por voz ou texto. Reconhecer comandos básicos como “buscar arroz”, “corrigir produto”, “ajuda”, “repetir”, “parar”, “próximo” e “nova busca”. Texto que não é comando no passo de produto vira descrição, sem depender de LLM.
2. Solicitar embalagem/variante quando necessária ou permitir “qualquer embalagem”. Separar o termo de busca de restrições como “2 litros” e “zero”. Não substituir marcas ou variantes silenciosamente.
3. Pedir município ou oferecer “usar minha localização”. Município precisa corresponder ao catálogo existente; ambiguidades exigem escolha. GPS só por consentimento do navegador, sem pressupor localização. Reutilizar limites atuais de raio de 1 a 15 km, com 5 km como proposta inicial; em falha de GPS oferecer município. Período inicial: 7 dias.
4. Mostrar e, se habilitado, ler produto, restrições, local, raio e período. Exigir “Confirmar busca” antes da chamada SEFAZ; “corrigir” permite editar cada campo. A mesma confirmação é usada após interpretação pela IA.
5. Consultar uma página usando o servidor existente. Apresentar até três menores preços entre os registros carregados que atendem aos filtros. Informar explicitamente essa abrangência, e não “o menor preço da cidade”.
6. Oferecer “Ouvir resultados”, “Próximo resultado”, “Repetir”, “Parar leitura”, “Carregar mais resultados” e “Nova busca”, todos também em botões e comandos de texto. Carregar mais é sempre explícito; nunca percorrer todas as páginas automaticamente.

“Próximo resultado” navega no conjunto já carregado. “Carregar mais resultados” busca a próxima página, agrega e reordena os resultados, anunciando a atualização. Páginas sem correspondências não encerram a busca se a API indicar páginas seguintes.

## Preços e correspondência de produtos

Reutilizar correspondência de palavras inteiras: “coca” não deve aceitar “paçoca”. No novo assistente, normalizar tamanhos equivalentes (2 L, 2L, 2 litros; 500 ml, 500ml), sem mudar a pesquisa atual. A consulta textual deve respeitar os limites existentes de 3 a 50 caracteres; restrições de embalagem e variante são verificadas nos dados retornados antes de ordenar.

Se a descrição não permitir verificar uma restrição, não incluir o item como correspondência confirmada. Informar quando não houver correspondências nesta página e oferecer carregar mais ou corrigir. Se a usuária escolher qualquer embalagem, mostrar embalagens e preços individualmente e avisar que os tamanhos variam. Não calcular equivalência ou preço por litro a partir de quantidade incerta.

Cada resultado contém descrição, embalagem quando identificável, valor efetivamente retornado, estabelecimento, município/endereço disponível e data da venda. Trata-se de preço de venda passada, sem promessa de estoque ou preço vigente. A resposta falada é formada por templates locais, sem passar resultados à LLM. Demonstração existente, se usada, deve ser anunciada como dados demonstrativos também na fala.

## IA opcional

Cloudflare Workers AI via API REST no servidor, por já ser a plataforma de implantação. Usar um adaptador substituível, inicialmente Llama 3.1 8B Instruct FP8, com identificador de modelo configurável no servidor. A variante FP8 foi escolhida na implementação porque a página do identificador original indicava indisponibilidade no catálogo oficial. O plano gratuito tem cota; não prometer IA ilimitada nem ativar plano pago automaticamente.

Configuração opcional em runtime: `CLOUDFLARE_ACCOUNT_ID`, secret `CLOUDFLARE_AI_API_TOKEN` e `VOICE_AI_MODEL`. Sem credenciais, o fluxo guiado funciona integralmente. REST permite uso local e no Worker sem substituir a configuração de build que a usuária já adaptou. Documentar token restrito à conta e permissão de Workers AI; nunca expor credenciais ao cliente ou usar o token da SEFAZ para a IA.

Oferecer “Interpretar pedido com IA” como opção explícita para pedidos livres, com aviso de envio do texto. Não enviar áudio, coordenadas, resultados, favoritos ou histórico ao modelo. Enviar apenas a frase atual e instruções de extração. O modelo devolve campos estruturados: descrição, embalagem, variante, nome de município, raio, dias e necessidade de esclarecimento. Valores ausentes permanecem ausentes. A LLM não executa ferramentas nem escolhe URLs; campos passam por validação de schema e depois pela validação compartilhada da consulta. Município precisa ser resolvido pelo catálogo local. Não confiar em confiança autodeclarada do modelo.

Limitar a entrada a 500 caracteres, uma chamada por ação, saída curta e timeout de 10 segundos, sem retentativa automática. Em erro, cota esgotada ou saída inválida, preservar a frase e oferecer continuar guiado. Aplicar limite conservador por sessão na interface para impedir chamadas acidentais repetidas; isso não é proteção contra abuso distribuído. Documentar que endpoint público pode consumir a cota global e que limites de borda opcionais dependem da implantação. Não tornar CAPTCHA um requisito de acessibilidade da busca guiada.

## Acessibilidade e estados

Usar controles nativos, rótulos explícitos, foco visível e ordem de tabulação previsível. Não depender de cor, ícones, hover ou voz. Estado do assistente é visível em texto; atualizações curtas em região `aria-live`, sem anunciar a lista inteira repetidamente. Erros vinculados ao campo. Foco retorna a um controle útil após cancelamento, sem saltos automáticos em cada fala.

Estados: pronto, ouvindo, interpretando, aguardando confirmação, pesquisando, exibindo resultados e erro recuperável. Reconhecimento e síntese nunca ficam ativos simultaneamente: ao iniciar microfone interromper leitura; ao iniciar leitura encerrar reconhecimento. “Parar” e sair da rota encerram áudio e descartam respostas tardias. Reconhecimento é pontual em pt-BR, sem reinício automático. Voz pt-BR quando disponível, com fallback à voz do sistema e transcrição textual sempre presente.

Web Speech API depende do navegador e pode usar serviço externo; não é garantia de transcrição grátis ilimitada nem offline. Sem suporte, mensagem clara e fluxo de texto completo. Não tentar detectar leitor de tela; a pessoa escolhe ouvir ou não.

## Integração e tratamento de falhas

Reutilizar `searchProducts`, `validateProductQuery`, catálogo de municípios, adapter e tipos atuais. Paginação: 50 por página para geolocalização, 100 para município, respeitando o comportamento existente. Instância de estado independente do formulário atual. Cancelamento deve invalidar respostas tardias e impedir leitura ou renderização de consulta anterior; não prometer aborto da chamada SEFAZ quando o transporte não o permitir.

HTTP 500 da SEFAZ deve ser apresentado como indisponibilidade da consulta, preservando campos e permitindo tentativa explícita. A IA não corrige essa falha e não fornece preços alternativos inventados. Novas chamadas à IA ficam em módulo server-only, sem registrar frases, secrets ou resposta bruta em logs. Nenhuma alteração nos presets de deploy é necessária para a entrega.

## Verificação e entrega

Testar comandos em pt-BR, palavras inteiras, tamanhos equivalentes e variantes; esquema inválido da LLM; timeout, ausência de credenciais e cota esgotada; confirmação antes da busca; resultado vazio com próxima página; preços/data/demonstração; cancelamento e respostas tardias; microfone negado/ausente; exclusão entre gravação e leitura. Executar testes existentes, TypeScript e build.

Verificar manualmente teclado e leitor de tela (NVDA com Chrome e VoiceOver com Safari, conforme disponibilidade), sem alegar suporte validado onde não foi testado. Reconhecimento real e permissão precisam de teste em dispositivo/navegador; mocks não comprovam acessibilidade final. Incluir roteiro para a usuária se o ambiente não permitir esses testes.

Commits na autoria Ana Ferreira <alsf@ic.ufal.br>. Entregar patch incremental com documentação de runtime, sem sobrescrever Vite/Cloudflare ou incluir secrets. Não publicar nem enviar commits ao GitHub automaticamente.

## Decisões deixadas à implementação

Nomes internos dos módulos, composição dos componentes, parser sem dependência adicional quando viável, escolha de voz entre as instaladas, exemplos de ajuda e detalhes visuais seguindo o projeto. Mudanças de provedor, escopo ou cobrança exigem revisão desta proposta.

## Referências técnicas

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://webllm.mlc.ai/

## Extensão posterior aprovada

Em 29/10/2026, a usuária solicitou e aprovou o suporte a combustíveis. Essa extensão substitui a exclusão inicial de combustíveis deste desenho e está documentada em `../plans/2026-10-29-voz-combustiveis.md`.
