# Economiza AL

Aplicativo independente para pesquisar e comparar preços de produtos e combustíveis em Alagoas, com dados do
serviço público **Economiza Alagoas (SEFAZ/AL)**. Não é um aplicativo oficial do governo.

## Executar

```
bun install
bun run dev      # http://localhost:8080
bun run test     # testes de regras (validação, adaptador, datas, moeda, cesta, cache)
```

## Variáveis de ambiente (somente servidor)

| Variável | Uso |
|---|---|
| `ECONOMIZA_API_BASE_URL` | URL base da API. **Precisa começar com `https://`.** |
| `ECONOMIZA_APP_TOKEN` | Token (AppToken) fornecido pela SEFAZ/AL. |

Nunca exponha essas variáveis com prefixo `VITE_`. O token não é registrado em logs nem devolvido em mensagens de erro.

### Token
Solicite pelo e-mail `api@sefaz.al.gov.br` informando CPF e nome do responsável e nome/URL do aplicativo (manual, seção 3).

### Transporte HTTPS — impedimento atual
O manual informa apenas `http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/`. Em 23/10/2026, uma
tentativa via HTTPS falhou: o certificado apresentado não corresponde ao nome `api.sefaz.al.gov.br`.
Por isso o proxy **recusa** URLs `http://` e mostra “consulta real desativada”. Para ativar:
1. Confirmar com a SEFAZ/AL um endereço HTTPS válido; ou
2. Usar um intermediário próprio com HTTPS até a SEFAZ por rede confiável.

## Arquitetura
- `src/lib/economiza/validation.ts` — regras do manual, compartilhadas entre formulário e servidor.
- `src/lib/economiza/api.functions.ts` — funções de servidor `searchProducts`, `searchFuel`, `getApiStatus`.
- `src/lib/economiza/proxy.server.ts` — só aceita `produto/pesquisa` e `combustivel/pesquisa`; timeout 15 s, 1 retentativa só para 5xx/429/rede, limite de 40 pesquisas/min por IP, cache.
- `src/lib/economiza/adapter.ts` — compatibilização das respostas (ver abaixo).
- `src/lib/economiza/compare.ts` — equivalência, cesta e concorrência limitada.
- `src/lib/store.ts` — lista, favoritos e preferências em `localStorage` (sem login, sem sincronização).

### Cache
Memória do servidor (por instância), TTL de 5 min, até 300 entradas. A chave inclui a operação e **todos** os campos do corpo, com chaves ordenadas. A interface indica quando o resultado veio do cache. Parâmetros em `constants.ts` (`CACHE`, `NET`).

### Decisões do adaptador
- Aceita `endereco` e `endereço` (o exemplo do manual usa acento; a tabela não).
- Aceita `totalPaginas` e `totalPaginas ` (espaço no exemplo).
- `gtin`, `ncm`, `cnpj`, `cep`, `codigoIBGE` são guardados como texto. Se a API enviar número, zeros à esquerda não podem ser recuperados.
- `gpc = 0` significa “não classificado”.
- Coordenadas `0,0` ou fora do intervalo são descartadas (sem distância).
- Registros sem preço válido, data ou descrição são ocultados e contados.
- `dataVenda` sem fuso é tratada como UTC e exibida em America/Maceio.
- **Essas decisões ainda precisam ser validadas contra respostas reais**, que não puderam ser obtidas sem token/HTTPS.

## Modo real × demonstrativo
O modo demonstrativo só é ligado por ação explícita (aviso nas telas ou “Sobre os dados”). Todas as telas de busca exibem a faixa “Modo demonstração: dados fictícios” e os resultados recebem o selo “fictícios”. Falhas reais nunca são trocadas por dados fictícios.

## Limitações da API
- Dados de vendas dos últimos 10 dias; não há preço atual, estoque, histórico, imagens, promoções nem consulta de cesta.
- A lista de compras faz uma pesquisa por item (3 em paralelo), com progresso e cancelamento.
- Itens sem código de barras precisam ser associados a um produto para entrar no total.

## Publicação
O backend são funções de servidor do próprio app (Cloudflare Workers). Configure as duas variáveis como segredos do ambiente publicado. O cache e o limite de requisições são por instância (melhor esforço).

## Testes executados
- `bun run test`: 18 testes (validação de limites e exclusividade, zeros à esquerda, adaptador, fuso, moeda, equivalência, cesta com itens ausentes, chave de cache).
- Verificação manual em navegador (desktop e 375 px): pesquisa em modo demo, seleção de município por teclado.

## Pendências reais
- Token e transporte HTTPS (dependem da SEFAZ/AL).
- Validação do adaptador com respostas reais.
- Auditoria automatizada de acessibilidade (axe) e revisão completa com leitor de tela ainda não executadas; não declaramos conformidade WCAG 2.2 AA.
