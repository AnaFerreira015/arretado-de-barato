# Arretado de Barato

Aplicativo independente para consultar e comparar preços registrados em vendas de Alagoas, usando o Economiza Alagoas da SEFAZ/AL.

## Executar

Use Node.js 22.12 ou superior (recomendado: Node.js 24).

```bash
npm install
npm run dev
```

O arquivo `.env.local` desta entrega já contém a configuração e o token informado. Ele é privado e ignorado pelo Git: não o publique nem compartilhe o ZIP publicamente. Em outra instalação, copie `.env.example` para `.env.local` e preencha `ECONOMIZA_APP_TOKEN`.

## API

As consultas passam pelas funções de servidor do TanStack Start. O navegador não recebe o token. O servidor envia `POST` para `produto/pesquisa` ou `combustivel/pesquisa`, com os cabeçalhos `appToken` e `Content-Type: application/json`.

Exemplo de corpo, conforme os prints:

```json
{
  "produto": { "descricao": "leite", "gpc": "50000000" },
  "estabelecimento": { "municipio": { "codigoIBGE": 2704302 } },
  "dias": 7,
  "pagina": 2,
  "registrosPorPagina": 5000
}
```

A configuração usa o endereço HTTP dos prints. Nesse trecho entre o servidor e a SEFAZ, HTTP não cifra o token. A exceção é limitada ao endereço oficial e exige `ECONOMIZA_ALLOW_HTTP=true`. Redirecionamentos são recusados. Quando houver endpoint HTTPS funcional, configure-o e desative essa opção. Não use prefixo `VITE_` nas variáveis privadas.

O adaptador lê `conteudo`, os metadados de paginação, `produto.venda` e `estabelecimento`; também aceita `endereço` e `totalPaginas ` com espaço final. Resultados de demonstração continuam disponíveis somente quando selecionados pelo usuário.

## Produção

```bash
npm run build
npm start
```

O build produz `.output/` para servidor Node.js. Execute `npm start` na raiz com `.env.local`, ou configure as três variáveis no provedor e use `node .output/server/index.mjs`. A aplicação precisa de servidor; não basta hospedar os arquivos estáticos.

## Verificação

```bash
npm test
npm run typecheck
npm run build
```

Listas, favoritos e preferências ficam no navegador. Os preços representam vendas passadas e não garantem preço ou estoque atual. Não é um aplicativo oficial do governo.

## Validação desta entrega

23 testes passaram, TypeScript sem erros e build de produção concluído. A chamada externa neste ambiente retornou HTTP 403 no endereço HTTP e 503 no HTTPS; portanto, a resposta real e a aceitação do token ainda precisam ser confirmadas no seu ambiente.
