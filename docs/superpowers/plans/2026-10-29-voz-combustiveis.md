# Extensão aprovada: combustíveis no assistente

Escopo: acrescentar seleção de produtos/combustíveis e acesso pela página de combustíveis. Reutilizar searchFuel e validação existente; não modificar formulários atuais. Comandos determinísticos e IA opcional reconhecem o catálogo de seis tipos; gasolina/diesel sem qualificador exigem escolha. Confirmar local, raio e período antes da consulta. Preservar paginação, cancelamento e modo demonstrativo. Ordenar somente unidades compatíveis: litro para líquidos, m³ para GNV, mantendo três casas decimais quando retornadas. Não pedir embalagem/variante de produtos no modo combustível. Trocar de modo invalida respostas antigas.

Execução: testes de parser, schema da IA, fluxo/endpoint, troca durante requisição, resultados/unidades e interface; implementar; verificar suite, TypeScript, lint e build; commits na autoria da usuária; entregar patch incremental sobre 8197271. Configuração da IA existente será reutilizada. Microfone/leitores de tela reais continuam pendentes de teste em dispositivo.

Concluído: parser/schema, consulta, unidades, UI e testes. Revisão independente: dois problemas relevantes corrigidos com regressões RED→GREEN (álcool no modo produto; IA exige esclarecimento). Suite final: 102 testes; TypeScript, lint e build aprovados. Nenhuma alteração de configuração do deploy ou de credenciais.
