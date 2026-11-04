# Arretado de Barato como aplicativo

O site agora inclui manifesto, ícones PNG para Android/iOS, convite de instalação recolhido no rodapé e página offline. Não exige pacote novo, token adicional ou mudança no adaptador de Cloudflare.

## Publicar e instalar

1. Aplique o patch e envie os commits para o repositório usado no deploy.
2. Publique normalmente na Cloudflare e abra o endereço HTTPS definitivo.
3. No rodapé, expanda **Instalar aplicativo**. O botão mostra **Instalar app grátis** quando há convite nativo, **Como instalar no iPhone/iPad** nesses aparelhos e **Como instalar o app** nos demais casos. Quando o navegador oferece instalação direta, o botão abre o convite; nos demais casos, expande as instruções para adicionar à tela inicial.
4. No Android/desktop, procure Instalar aplicativo ou Adicionar à tela inicial no menu do navegador. No iPhone/iPad, use Chrome ou Safari: Compartilhar > Adicionar à Tela de Início > Adicionar; habilite Abrir como App se essa opção aparecer.

O botão aparece mesmo sem convite automático do navegador e é ocultado na janela instalada. Não indica publicação na Play Store ou App Store. Em navegadores embutidos (por exemplo, dentro de redes sociais), abra o endereço no navegador externo. O app abre em janela própria nos ambientes que suportam standalone. A tela inicial de abertura é definida pelo sistema a partir do manifesto e dos ícones; não é uma tela personalizada universal.

## Conexão e atualizações

O service worker só é registrado em builds de produção em contexto seguro (HTTPS ou localhost). `npm run dev` não registra um novo worker. Para testar localmente, faça build e rode o servidor de produção; não use a mesma origem do desenvolvimento se quiser evitar que um worker antigo controle o dev.

Somente `/offline.html` é pré-carregado. Nenhum preço, resposta de IA, token, coordenada, consulta, HTML dinâmico ou bundle da aplicação é salvo pelo worker. Sem rede, uma nova navegação mostra o aviso offline. Uma página já aberta mostra um aviso de conexão perdida. Favoritos e listas continuam no armazenamento local existente, mas esta versão não oferece abertura dessas telas sem internet.

O worker não intercepta POSTs, fetches de API nem arquivos estáticos. Erros HTTP do servidor são preservados; o aviso offline é usado quando a navegação falha na rede. Uma atualização do worker aguarda o fechamento das abas controladas, sem forçar recarga nem descartar formulários. Ao alterar a página offline, incremente a versão de `CACHE_NAME` em `public/sw.js`. Somente caches com prefixo `arretado-offline-` são limpos.

## Conferência após o deploy

- `/manifest.webmanifest`: JSON válido, HTTP 200 e tipo de conteúdo de manifesto/JSON.
- `/sw.js`: JavaScript, HTTP 200, sem redirecionar para HTML/login. Não aplicar regra de cache imutável a esse arquivo.
- `/offline.html` e `/icons/*.png`: HTTP 200. A configuração de assets precisa servir os arquivos da pasta public na raiz do domínio.
- DevTools > Application: manifesto e worker sem erros; ícones comuns e maskable visíveis.
- Instalar, fechar e reabrir pelo ícone; conferir produtos, combustíveis, lista e favoritos.
- Depois da primeira visita online e da ativação do worker, desligar a rede e recarregar: conferir aviso offline. Reconectar e usar Tentar novamente.
- Testar microfone e leitura de resultados em Android e iPhone reais. A PWA não amplia o suporte de voz do navegador: permissões e suporte à Web Speech API continuam necessários; entrada por texto permanece disponível.

## Verificações nesta entrega

Testes automatizados cobrem instalação aceita/cancelada/falha, modo standalone, evento de instalação, aviso de conexão e estratégia do worker. TypeScript, lint e build são verificados na entrega. A instalação real, o microfone e o comportamento específico do Safari/Android precisam de validação em aparelhos reais; esta entrega não publica nas lojas.

Referências: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable e https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
