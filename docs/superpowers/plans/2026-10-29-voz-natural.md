# Conversa natural — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Interpretar pedidos e correções naturais preservando a confirmação.
**Architecture:** Interpretador local conservador + alternativa Workers AI com contexto validado; um fluxo comum para fala e texto.
**Tech Stack:** React, TypeScript, Zod, Vitest.
**Spec:** docs/superpowers/specs/2026-10-29-voz-natural-design.md

## Global Constraints
- Manter consultas SEFAZ no servidor e confirmação explícita.
- Não enviar GPS, resultados ou histórico à IA.
- Manter fallback manual e autorização separada do navegador para localização.
- Não modificar configuração Cloudflare/Nitro.

## Review Focus
- Negação não pode confirmar nem apagar restrições.
- Troca de produto não deve herdar tamanho/variante do anterior.
- Correção deve preservar campos não alterados.
- Respostas tardias após cancelamento não mudam o rascunho.
- Falha de IA não permite pesquisar silenciosamente o pedido antigo.

### Task 1: Interpretação local
Files: natural.ts/test.ts, intent.ts/test.ts.
- [x] Testar frases completas, correções, negativas e aliases antes de implementar.
- [x] Implementar análise conservadora com resultado tipado e fallback para IA.
- [x] Executar testes e registrar commit.

### Task 2: Fluxo híbrido e IA contextual
Files: useVoiceAssistant.ts/test.tsx, ai.schema.ts, ai.functions.ts, ai.server.ts, ai.test.ts, VoiceAssistant.tsx/test.tsx, flow.ts.
- [x] Testar pedidos naturais, confirmação, correção, falha/cancelamento e opção sem IA.
- [x] Integrar contexto validado, avanço sem perguntas redundantes, fallback e aviso na interface.
- [x] Executar suite completa, typecheck, lint e build. Revisão independente ao final.
- [x] Documentar, commitar e entregar patch incremental.

## Registro de execução

Execução local na branch isolada existente feat/assistente-voz. Task 1: 902e718; análise local e aliases validados após RED→GREEN. Task 2: integração contextual, opção visível de IA e fluxo com confirmação; testes de regressão antes de cada correção.

Revisão independente: preservar variante na correção do mesmo produto, interpretar quantidade antes do nome e encaminhar exclusões com “sem” para esclarecimento. Todos corrigidos e cobertos por testes que falharam antes. Decisão de implementação: manter cinco tentativas de IA por visita e fallback guiado, sem alterar cota ou provedor. Sem push/deploy; entrega incremental desde 5c29e07.
