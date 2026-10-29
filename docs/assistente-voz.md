# Assistente de voz

Função adicional em `/assistente`, acessível pelo início da busca. A pesquisa original permanece disponível. O fluxo guiado e a leitura dos resultados não precisam de LLM. Reconhecimento de voz depende do navegador; texto e teclado estão sempre disponíveis.

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

1. Em Chrome com NVDA e Safari com VoiceOver, abrir Assistente de voz pelo teclado, completar a pesquisa e voltar à busca. Conferir labels, foco e anúncios sem repetição excessiva.
2. Com respostas faladas inicialmente desligadas, conferir que não há voz competindo com leitor de tela. Habilitar leitura explicitamente, testar repetir/parar/próximo.
3. Negar microfone e localização; completar por texto e município. Testar navegador sem SpeechRecognition e leitura sem voz pt-BR instalada.
4. Falar “buscar coca zero de dois litros”, conferir campos e município, confirmar. Conferir tamanho dos resultados; carregar mais quando a primeira página estiver vazia.
5. Interromper durante consulta, gravação e leitura; sair da rota. Respostas antigas não devem reaparecer nem iniciar áudio.
6. Testar IA com credenciais, sem elas, com cota esgotada e timeout. Manter possibilidade de continuar guiado. Não confundir falha de IA com falha da SEFAZ.

Referências: [REST Workers AI](https://developers.cloudflare.com/workers-ai/get-started/rest-api/), [modelo FP8](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/), [preços e cotas](https://developers.cloudflare.com/workers-ai/platform/pricing/), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
