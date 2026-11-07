# Revisão de acessibilidade — Arretado de Barato

Data: 07/11/2026. Referência: WCAG 2.2, níveis A e AA.

## Resultado e limites

Foram corrigidos problemas identificados na revisão de código e adicionados testes de regressão. Isso **não comprova conformidade integral**: a auditoria visual em navegador e os testes com tecnologias assistivas reais ainda precisam ser concluídos.

O Chromium disponível neste ambiente não iniciou: o sistema bloqueou a criação do socket do navegador. Por isso não foram verificados visualmente contraste renderizado, zoom, refluxo, foco encoberto, teclado completo ou a árvore de acessibilidade após hidratação. Não houve teste com VoiceOver, TalkBack ou NVDA. A consulta real da SEFAZ e o reconhecimento de voz dependem de serviços/permissões externos e não foram validados ponta a ponta nesta revisão.

## Correções

- Rótulos associados às caixas de seleção de município e confirmação de equivalência.
- Erros vinculados aos campos de CNPJ, GPC, NCM, item, quantidade, código de barras e distância.
- Foco no primeiro campo inválido após envio dos formulários de busca e inclusão na lista.
- Opções de tipo de busca e combustível usam rádios nativos, com interação por setas fornecida pelo navegador.
- Distância usa controle nativo com nome, limites, unidade em quilômetros e erro associado.
- Foco no conteúdo principal quando muda a página, sem deslocá-lo em alterações de filtros na mesma página.
- Botões de resultados identificam produto e estabelecimento; títulos dos cartões têm IDs únicos.
- Região de resultados com nome persistente, sem referência a título ausente ou duplicado; paginação anuncia carregamento.
- Fechamento de diálogos em português e alvo de 44 × 44 px no componente compartilhado.
- Chat com rótulo visível para mensagem e retorno de foco seguro quando o elemento que abriu o chat foi removido.
- Lista de definições da comparação com agrupamentos semânticos válidos.
- Página de erro geral em português, com região principal e indicação de foco.

## Verificação executada

- TypeScript sem erros.
- Suíte Vitest: 213 testes aprovados, incluindo cinco novos testes de acessibilidade.
- ESLint dos arquivos alterados: nenhum erro; quatro avisos de Fast Refresh em arquivos que já exportam funções junto com componentes.
- Build de produção concluído.
- axe-core sobre o HTML inicial renderizado pelo servidor de `/`, `/categorias`, `/lista`, `/favoritos`, `/comparar` e `/sobre`: nenhuma violação nas regras executáveis de WCAG A/AA selecionadas. Análise em JSDOM, com contraste desativado: não equivale a uma auditoria da interface hidratada ou de estados interativos.

## Validação manual necessária antes de declarar conformidade

1. Com teclado, percorrer cada página usando Tab e Shift+Tab; ativar o link de pular conteúdo; operar rádios com setas, busca de município, distância, filtros e paginação. O foco deve ser visível e nenhum controle pode ficar atrás das barras fixas.
2. Abrir detalhes, instalação e chat. Verificar foco inicial, permanência do foco no diálogo, fechamento por Escape e retorno ao acionador. Confirmar que o teclado virtual não encobre a mensagem ou o botão Enviar.
3. Com NVDA/Firefox ou Chrome no desktop, VoiceOver/Safari no iPhone e TalkBack/Chrome no Android, testar rótulos, grupos, erros, resultados, paginação, seleção de categoria e mensagens do chat. Confirmar que anúncios não se repetem excessivamente.
4. Testar zoom de 200% e 400%, largura de 320 CSS px, orientação horizontal e espaçamento de texto personalizado. Não deve haver perda de conteúdo nem rolagem horizontal desnecessária.
5. Medir contraste de todos os estados renderizados, incluindo hover, foco, seleção, mensagens e sobreposições: texto normal 4,5:1; texto grande e componentes essenciais 3:1.
6. Testar a opção de reduzir movimento e o modo de alto contraste/cores forçadas.
7. Sem microfone, sem geolocalização, offline ou com erro da SEFAZ, confirmar que é possível continuar por texto e município e que a recuperação é anunciada.
8. Testar com pessoas cegas e com baixa visão nas tarefas reais: encontrar menor preço, escolher categoria, comparar, favoritar e montar lista. Registrar barreiras e corrigir antes da avaliação final.
