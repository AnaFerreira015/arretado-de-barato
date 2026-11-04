# Chat, gravação contínua e navegação por categorias

Objetivo: aplicar o feedback de uso ao Arretado de Barato mantendo as consultas existentes.

Decisões: chat modal acessível com histórico local à sessão, um campo de texto e gravação iniciada pelo usuário. Configurações ficam recolhidas. Ao fechar, áudio e requisições são cancelados e a conversa é encerrada. Links antigos do assistente abrem o chat sobre a busca. Categorias usam a classificação GPC real e abrem o formulário existente dentro dessa área; não disparam busca sem nome/local. A home tem título curto, escolha de tipo e formulário. Instalação fica no rodapé, em seção expansível.

- [x] Substituir escuta de frase única por reconhecimento contínuo, transcrição parcial, retomada após encerramento de trecho e envio explícito; cancelar interrompe retomadas e callbacks.
- [x] Acrescentar histórico em memória ao hook; abrir chat pela navegação e pela busca, com diálogo Radix e encerramento ao fechar.
- [x] Criar /categorias, filtro por nome e seleção de GPC para reutilizar o painel de produtos.
- [x] Reduzir banner inicial e mover instalação para o rodapé.
- [x] Validar testes, tipos, lint, build, rotas e aplicação do patch incremental.

Limites: reconhecimento depende do navegador e de permissões; não há upload/armazenamento de arquivos de áudio. Não é possível garantir duração ilimitada no serviço de voz do navegador. O aplicativo não aplica corte de cinco segundos. A transcrição só inicia a busca quando o usuário toca em Enviar áudio.
