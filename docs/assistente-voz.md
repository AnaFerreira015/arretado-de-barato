# Assistente de voz

Função adicional em `/assistente`, acessível pelo início da busca. A pesquisa original permanece disponível. O fluxo guiado e a leitura dos resultados não precisam de LLM. Reconhecimento de voz depende do navegador; texto e teclado estão sempre disponíveis.

## Aplicar o patch

O patch parte do projeto com os patches anteriores de consulta, correspondência de produtos e diagnóstico já aplicados. Ele não altera Vite, Nitro ou a configuração Cloudflare adaptada na sua máquina.

Salve suas alterações locais em commit antes de aplicar. Na raiz do projeto, usando o caminho onde baixou o arquivo:

```bash
git switch -c feat/assistente-voz
git am --3way /caminho/assistente-voz.patch
npm test
npm run typecheck
npm run build
```

`git am` mantém as mensagens e a autoria dos commits incluídos. Se houver conflito, resolva os arquivos apontados, use `git add` nesses arquivos e `git am --continue`; para desfazer somente essa aplicação em andamento, use `git am --abort`. Não substitua seu projeto por um ZIP antigo.

Não há dependências novas. Depois de validar localmente, faça o deploy pelo fluxo que já usa. Acesse `/assistente` ou o botão “Assistente de voz” na pesquisa de produtos.

## Configuração opcional da IA

No Cloudflare Workers, abra Settings → Variables and Secrets e cadastre em **runtime**, não apenas nas variáveis de build:

| Tipo | Nome | Valor |
| --- | --- | --- |
| Texto | `CLOUDFLARE_ACCOUNT_ID` | ID da sua conta Cloudflare |
| Secret | `CLOUDFLARE_AI_API_TOKEN` | Token específico do Workers AI |
| Texto | `VOICE_AI_MODEL` | `@cf/meta/llama-3.1-8b-instruct-fp8` |

Crie o token na página Workers AI → Use REST API → Create a Workers AI API Token. Restrinja à sua conta; o template inclui Workers AI Read e Edit. Não use o token da SEFAZ. Salve e aplique/reimplante conforme o painel. O Worker deve disponibilizar essas variáveis em `process.env`, como já faz para `ECONOMIZA_APP_TOKEN` (compatibilidade Node do deploy existente).

Localmente, coloque os mesmos valores em `.env.local`, ignorado pelo Git, e reinicie o servidor. Nunca use prefixo `VITE_` para esses secrets. Não é necessário mudar Vite, presets Nitro nem criar um binding de AI: a integração usa REST no servidor. Sem credenciais, continue pelo modo guiado.

O plano gratuito tem cota compartilhada pela conta. A aplicação não ativa contratação nem garante uso ilimitado. Há no máximo cinco tentativas de interpretação por visita ao assistente, uma de cada vez; isso evita cliques acidentais, não impede abuso de endpoint público. Para proteção adicional, configure limites na borda conforme seu plano Cloudflare. Não habilite cobrança automática se seu objetivo é permanecer na franquia gratuita. Falha, demora ou cota da IA não bloqueiam a pesquisa guiada.

## Dados e privacidade

O botão Falar pode enviar áudio ao serviço de reconhecimento do navegador. Não há escuta automática. A interpretação com IA é uma ação separada: envia somente o texto digitado/transcrito à Cloudflare, sem histórico, GPS, resultados ou favoritos. Não escreva dados pessoais no pedido. Não armazenamos transcrições/gravações. A localização só é solicitada por ação explícita e não é persistida.

A IA propõe campos, e você confere antes de pesquisar. Preços vêm da SEFAZ; não da LLM. Ordenação cobre apenas os registros carregados. Embalagens não identificáveis não confirmam filtro de tamanho. O modo demonstrativo é identificado também na leitura. HTTP 500 da SEFAZ continua sendo indisponibilidade da fonte e permite nova tentativa explícita.

## Verificação manual

Verificação automatizada em 29/10/2026: 87 testes passaram, incluindo comandos, filtros, fluxo, integração simulada com IA, cancelamento e áudio simulado. TypeScript e build aprovados. A rota `/assistente` respondeu HTTP 200 com HTML do assistente em teste local do servidor de produção; o bundle cliente não contém o adaptador REST nem as variáveis privadas da IA.

Limites desta validação: não foi possível testar microfone real, NVDA, VoiceOver ou dispositivos móveis neste ambiente. Não foram fornecidas credenciais Workers AI, portanto a chamada real à LLM e a implantação Cloudflare precisam ser conferidas na sua conta. Não foi feita consulta real à SEFAZ para validar voz. Use o roteiro abaixo antes de disponibilizar a função ao público.

1. Em Chrome com NVDA e Safari com VoiceOver, abrir Assistente de voz pelo teclado, completar a pesquisa e voltar à busca. Conferir labels, foco e anúncios sem repetição excessiva.
2. Com respostas faladas inicialmente desligadas, conferir que não há voz competindo com leitor de tela. Habilitar leitura explicitamente, testar repetir/parar/próximo.
3. Negar microfone e localização; completar por texto e município. Testar navegador sem SpeechRecognition e leitura sem voz pt-BR instalada.
4. Falar “buscar coca zero de dois litros”, conferir campos e município, confirmar. Conferir tamanho dos resultados; carregar mais quando a primeira página estiver vazia.
5. Interromper durante consulta, gravação e leitura; sair da rota. Respostas antigas não devem reaparecer nem iniciar áudio.
6. Testar IA com credenciais, sem elas, com cota esgotada e timeout. Manter possibilidade de continuar guiado. Não confundir falha de IA com falha da SEFAZ.

Referências: [REST Workers AI](https://developers.cloudflare.com/workers-ai/get-started/rest-api/), [modelo FP8](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/), [preços e cotas](https://developers.cloudflare.com/workers-ai/platform/pricing/), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Extensão para combustíveis

Depois de aplicar `assistente-voz.patch`, aplique `assistente-voz-combustiveis.patch` com `git am --3way /caminho/assistente-voz-combustiveis.patch`. Esta extensão reutiliza as credenciais Workers AI já documentadas; não exige nova configuração nem dependências.

Na página de combustíveis, clique em **Assistente de voz — buscar combustíveis**, ou escolha **Combustíveis** no assistente. O acesso direto é `/assistente?modo=combustivel`. Exemplos guiados:

- “Buscar gasolina comum mais barata em Maceió”.
- “Etanol”; depois informe o município ou solicite localização.
- “Diesel S10” ou “GNV”.

“Gasolina” e “diesel” sem qualificador exigem escolha do tipo. Para corrigir, diga “corrigir combustível”. “Buscar produtos” e “buscar combustíveis” trocam o modo, descartando a consulta anterior. A nova busca mantém o modo escolhido. Em pedidos livres, a IA propõe o tipo e você o confirma antes da consulta. Embalagem e variante de produtos não são pedidas no modo combustível.

A comparação preserva a precisão de até três casas decimais. Líquidos são comparados por litro e GNV por metro cúbico; registros com unidade desconhecida ou incompatível ficam fora da ordenação. São os menores valores entre os registros carregados, não uma garantia de menor preço atual em toda a região. A busca original de combustíveis permanece disponível.

Inclua na verificação manual: trocar de modo com consulta pendente, negar GPS, corrigir tipo, consultar GNV e conferir a unidade falada, carregar mais/repetir uma página que falhou. Testes automatizados não substituem a validação com microfone e leitor de tela reais.

Validação desta extensão (29/10/2026): 102 testes passaram, TypeScript e build aprovados, lint dos módulos do assistente sem erros. A revisão independente identificou e os testes de regressão cobriram a preservação de “álcool” no modo produtos e o esclarecimento obrigatório de pedidos ambíguos da IA. Permanecem as limitações de validação real de voz, leitores de tela e APIs externas descritas acima.
