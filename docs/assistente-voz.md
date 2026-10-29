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

O botão Falar pode enviar áudio ao serviço de reconhecimento do navegador. Não há escuta automática. Com “Usar IA para entender frases complexas” ativado, pedidos não resolvidos localmente enviam o texto digitado/transcrito e os campos atuais da busca à Cloudflare. A opção pode ser desativada; o botão separado de interpretação continua disponível. Não enviamos histórico, coordenadas GPS, resultados ou favoritos à IA. Não escreva dados pessoais no pedido. Não armazenamos transcrições/gravações. A localização só é solicitada por ação explícita e não é persistida.

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


## Conversa natural (modo híbrido)

Após os patches de voz, combustíveis e estilo, aplique:

```bash
git am --3way /caminho/voz-natural.patch
```

A opção **Usar IA para entender frases complexas** vem ativada nesta função. Pedidos simples e comandos são resolvidos localmente; frases mais complexas usam a integração Workers AI existente. Não há novas credenciais. As cinco tentativas por visita e a cota do provedor continuam valendo; o modo guiado não consome tokens. Sem IA configurada, os pedidos locais e os controles continuam funcionando.

Exemplos:
- “Eu queria uma Coca zero de dois litros mais barata em Maceió, por favor”.
- “Um litro de leite em Maceió” (também aceita “quero um litro de leite”).
- “Quero gasolina comum mais barata perto de mim” (o navegador pede permissão de localização).
- “Na verdade, quero de um litro” preserva o produto e a variante.
- “Pode buscar”, “sim”, “mostra outro”, “pode repetir” e “pode parar”.
- “Tanto faz” ou “não tenho preferência” respondem às perguntas de embalagem e variante.

Informações fornecidas não são perguntadas novamente; pedidos completos vão ao resumo para confirmação. O resumo informa também os padrões de período, raio e eventuais tamanhos/variantes livres. Gasolina/diesel sem tipo exigem esclarecimento. Restrições que a consulta não representa, como exclusão de variante ou teto de preço, devem ser esclarecidas pela IA; não há garantia de compreensão de qualquer frase. Revise sempre o resumo antes de confirmar.

Correções complexas enviam os campos atuais validados ao modelo. Mudança de produto limpa tamanho e variante; correção do mesmo produto preserva campos não alterados. Cancelamento ignora respostas pendentes. Quando uma interpretação falha ou está desativada e o pedido não é compreendido, a confirmação anterior é invalidada e o usuário pode retomar pelo modo guiado.

Validação automatizada: 135 testes, incluindo pedidos completos, correções, contexto sem GPS, quantidade antes do produto, exclusões, fallback, cancelamento e confirmação. TypeScript, lint do assistente e build verificados. A revisão independente encontrou três casos de interpretação local, corrigidos com regressões RED→GREEN. Não houve validação de microfone real, leitores de tela, modelo remoto nem deploy Cloudflare nesta alteração.
