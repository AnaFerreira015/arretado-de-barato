# Melhorias de performance — 07/11/2026

Base: commit d05b612 (correções de acessibilidade).

## Alterações

1. O código da conversa por voz é importado sob demanda. A abertura do diálogo continua imediata, com aviso acessível de carregamento. Fechar e retornar o foco continuam disponíveis durante o download. A navegação e a busca por texto não precisam aguardar esse código.
2. Consultas idênticas em andamento compartilham uma promessa no servidor, por instância do Worker. Isso evita chamadas duplicadas, processamento e desserialização repetidos na SEFAZ. A chave inclui operação e todos os campos da consulta. As verificações de configuração e os limites por cliente permanecem antes do compartilhamento. O registro de promessas é limitado e limpo tanto no sucesso quanto no erro. O cache existente continua com validade de cinco minutos; erros não são armazenados.
3. Ordenação por proximidade calcula cada distância uma vez por ordenação, preservando estabilidade, dados originais e posição final de estabelecimentos sem coordenadas.

## Evidências

| Medida | Antes | Depois |
| --- | ---: | ---: |
| Arquivo JavaScript principal, sem compressão | 428.149 bytes | 338.909 bytes |
| Mesmo arquivo com gzip, nível padrão do Python | 130.143 bytes | 106.793 bytes |
| Chamadas externas para duas consultas idênticas simultâneas, no teste | 2 | 1 |
| Cálculos de distância para o cenário de 100 registros georreferenciados, no teste | 199 | 100 |

A redução do arquivo principal foi de 20,8% sem compressão e 17,9% com gzip. São tamanhos do artefato `assets/index-*.js` gerado por `npm run build`, não uma medição do total de dados transferidos pela página. Os módulos do chat são transferidos quando ele é aberto. O gzip de produção pode ter tamanho diferente conforme a configuração do servidor.

## Validação

- 218 testes aprovados, incluindo carregamento sob demanda, retorno de foco, consultas concorrentes, recuperação após erro, isolamento de páginas e preservação da ordenação.
- TypeScript, ESLint dos arquivos alterados, build de produção e verificação de espaços do Git aprovados.
- Patch incremental aplicado sobre a base em checkout separado e conteúdo final comparado.

Os testes de concorrência utilizam respostas simuladas; não houve consulta real à SEFAZ nem medição de Lighthouse/Core Web Vitals. O navegador deste ambiente continua impedido de iniciar. O compartilhamento em memória não atravessa instâncias diferentes do Cloudflare Worker. A latência externa da SEFAZ, especialmente em buscas de raio amplo, permanece fora do controle da aplicação.
