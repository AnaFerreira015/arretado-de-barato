# Chat de voz e categorias

O botão Por voz agora abre um diálogo sobre a página em uso. Também há uma ação compacta Buscar por voz no formulário inicial. O foco fica no diálogo e retorna ao acionador ao fechar. Fechar encerra a sessão de conversa, cancela o microfone e invalida consultas pendentes. O caminho antigo /assistente continua abrindo o chat e retorna à busca.

O chat usa os mesmos interpretadores, validações e consultas de produtos/combustíveis. O histórico fica só na memória da sessão (até 60 mensagens), sem ser enviado integralmente à IA. Continua sendo enviado somente o contexto estruturado já usado anteriormente.

## Gravação

Toque no microfone, fale e use Enviar áudio ao terminar. A transcrição parcial fica visível; só o envio inicia a interpretação/busca. O reconhecimento usa continuous/interimResults e retoma a escuta quando o navegador encerra um trecho, reunindo o texto anterior. Cancelar e fechar o chat impedem reinícios e resultados tardios. Falha de permissão/serviço encerra a gravação e permite editar o texto reconhecido.

Não havia temporizador de cinco segundos no projeto: a implementação antiga usava frase única e interrompia no primeiro resultado. Essa interrupção foi removida. Os limites e a disponibilidade do serviço de reconhecimento continuam dependendo do navegador, especialmente no iPhone. Esta função transcreve fala; não grava um arquivo de áudio para envio a um novo provedor.

## Categorias e início

Categorias tem rota própria /categorias e navegação no cabeçalho/rodapé móvel. Os cartões visuais usam ícones locais e nomes/códigos GPC do catálogo existente. A seleção abre o painel compartilhado com o filtro GPC correspondente; o usuário informa produto e local para consultar. Nem todos os produtos têm classificação na origem.

O banner de marketing da home foi substituído por um título curto. A instalação foi movida para uma seção expansível no rodapé. Os avisos sobre demonstração e origem dos dados continuam acessíveis.

## Verificação em dispositivos

Conferir teclado virtual/rolagem do diálogo, retorno de foco, leitura de novas mensagens e gravação com pausas superiores a cinco segundos em Android e iPhone reais. Testar negação de microfone e indisponibilidade do serviço. Essa validação real não foi realizada no ambiente desta entrega.
