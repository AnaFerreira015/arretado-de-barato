# Assistente de voz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Acrescentar busca guiada acessível por voz e texto com interpretação opcional por IA.

**Architecture:** Rota independente `/assistente`, estado em memória, parser e filtros determinísticos. Função de servidor isolada chama Workers AI; consultas de preços reutilizam `searchProducts`. Controlador de áudio impede gravação e reprodução simultâneas.

**Tech Stack:** React 19, TypeScript, TanStack Start, Web Speech API, Zod, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-29-assistente-voz-design.md`

## Global Constraints

- Preservar busca atual, filtros, favoritos e listas.
- LLM opcional, sem credenciais no cliente, sem histórico ou gravações persistidas.
- Entrada IA 500 caracteres, timeout 10 segundos, uma chamada por ação, sem retentativa automática.
- Raio 1–15 km (inicial 5), período 1–10 dias (inicial 7), páginas 50 para GPS e 100 para município.
- Confirmação antes de consulta, sem localização presumida, preços somente da API.
- Commit como Ana Ferreira <alsf@ic.ufal.br>; patch incremental sem modificar build/Cloudflare.
- Escolha de implementação: modelo `@cf/meta/llama-3.1-8b-instruct-fp8`, validado no catálogo em 29/10/2026.

## Review Focus

- Embalagens multipack e descrições conflitantes não podem confirmar uma embalagem simples incorreta.
- IA que omite município ou retorna campos extras não pode aproveitar GPS/consulta antigos silenciosamente.
- Cancelar ou editar durante requisição não pode exibir/ler resultados antigos.
- Falha na próxima página deve permitir repetir a mesma página, sem perder resultados.
- Eventos tardios do microfone e síntese não devem reativar áudio após saída ou parada.

---

### Task 1: Domínio determinístico

**Files:** Create `src/lib/voice/intent.ts`, `results.ts`, `intent.test.ts`, `results.test.ts`.

**Interfaces:** `parseCommand(text): Command`; `parseProduct(text): ProductIntent` com descrição, embalagem e variante; `resolveMunicipio(text): number | null`; `matchesVoiceRecord(record, intent): boolean`; `rankVoiceRecords(records, intent): SaleRecord[]`; `describeRecord(record, index, demo): string`.

- [x] Escrever testes para comandos com acentos, coca/paçoca, 2L/2 litros/2000ml, variante zero, multipack e embalagem desconhecida; município exato; ordenação/deduplicação e data/preço/demonstração falados.
- [x] Executar `npm test -- src/lib/voice/intent.test.ts src/lib/voice/results.test.ts`; observar falhas por funcionalidade ausente.
- [x] Implementar parser conservador e filtros sem alterar `productMatching.ts`; quantidade normalizada em ml/g com exclusão de multipacks quando tamanho simples pedido.
- [x] Executar `npm test`; esperado suite verde.
- [x] Commit `Adiciona interpretação guiada e comparação de produtos por voz`.

### Task 2: Interpretação opcional no servidor

**Files:** Create `src/lib/voice/ai.schema.ts`, `ai.server.ts`, `ai.functions.ts`, `ai.test.ts`; modify `.env.example`; create `docs/assistente-voz.md`.

**Interfaces:** `interpretVoiceText(text: unknown): Promise<InterpretResponse>`; `interpretVoice` server function `{data:{text:string}}`; resultado discriminado `ok`, proposta estruturada validada ou código de indisponibilidade. `aiIntentSchema` não aceita campos extras nem coordenadas.

- [x] Testes de ausência de segredo, entrada longa, campo extra, município inválido, 429/500, timeout, JSON inválido e contrato HTTP (sem enviar dados além da frase).
- [x] Executar `npm test -- src/lib/voice/ai.test.ts`; observar falhas.
- [x] Implementar adaptador REST fixo HTTPS Cloudflare e configuração runtime; validar input antes de enviar, saída via Zod antes de expor, sem logs sensíveis. Sem seguir redirects.
- [x] Documentar config e limites; executar `npm test`; esperado verde.
- [x] Commit `Integra interpretação opcional com Workers AI no servidor`.

### Task 3: Voz, fluxo guiado e interface adicional

**Files:** Create `src/lib/voice/speech.ts`, `speech.test.ts`, `useVoiceAssistant.ts`, `useVoiceAssistant.test.tsx`, `src/components/voice/VoiceAssistant.tsx`, `VoiceAssistant.test.tsx`, `src/routes/assistente.tsx`; modify `src/routes/index.tsx` e árvore gerada.

**Interfaces:** `createSpeechController(callbacks)` com `listen`, `speak`, `stop`, `dispose`, capacidades detectadas; hook próprio coordena draft, estágio, confirmação, paginação, cancelamento, IA e áudio. Interface usa botões e formulários nativos, labels, status e links.

- [x] Testar gravação pontual pt-BR, negar/ausência de microfone, leitura cancela reconhecimento, parada/saída invalidam eventos tardios.
- [x] Executar testes speech; observar falha; implementar controlador e verificar.
- [x] Testar fluxo guiado sem IA, confirmação obrigatória, correção, município/GPS, JSON da IA não executa pesquisa, resultados menores entre carregados, vazio paginável, erro de próxima página, stale responses e troca de demo.
- [x] Executar testes hook/UI; observar falha; implementar hook independente e interface acessível, IA explicitamente acionada com limite de 5 interpretações por visita à rota.
- [x] Adicionar rota e link no início da busca, sem modificar seus controles. Gerar árvore pelo build.
- [x] Executar `npm test`, `npm run typecheck`, `npm run build`; esperado verde.
- [x] Commit `Adiciona assistente acessível de pesquisa por voz e texto`.

### Task 4: Revisão, documentação e entrega

**Files:** Finalizar `docs/assistente-voz.md`, spec/plan; patch externo ao repo.

- [x] Revisar diff inteiro em contexto novo; corrigir problemas importantes com testes de regressão.
- [x] Verificar teclado e interface em navegador quando disponível; registrar o que não pôde ser testado (microfone real, leitores de tela, credenciais IA).
- [x] Executar suite, TypeScript, build e `git diff --check`; conferir bundle cliente sem código/segredos de servidor.
- [x] Documentar instalação via patch, config runtime e roteiro manual NVDA/VoiceOver.
- [x] Commit final e gerar patch incremental desde `162e77f`, incluindo commits de design/plan, preservar configs de deploy.

## Registro de execução

Implementação concluída na branch `feat/assistente-voz`. A revisão independente reproduziu falhas em multipacks/descrições ambíguas e no estado após rejeição da IA; ambas foram cobertas por regressões que falharam antes da correção. O ambiente não ofereceu navegador instalado, microfone ou leitores de tela: o roteiro manual permanece em `docs/assistente-voz.md`, sem alegação de validação nesses dispositivos.
