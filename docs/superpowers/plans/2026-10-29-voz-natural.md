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
- [ ] Testar frases completas, correções, negativas e aliases antes de implementar.
- [ ] Implementar análise conservadora com resultado tipado e fallback para IA.
- [ ] Executar testes e registrar commit.

### Task 2: Fluxo híbrido e IA contextual
Files: useVoiceAssistant.ts/test.tsx, ai.schema.ts, ai.functions.ts, ai.server.ts, ai.test.ts, VoiceAssistant.tsx/test.tsx, flow.ts.
- [ ] Testar pedidos naturais, confirmação, correção, falha/cancelamento e opção sem IA.
- [ ] Integrar contexto validado, avanço sem perguntas redundantes, fallback e aviso na interface.
- [ ] Executar suite completa, typecheck, lint e build. Revisão independente ao final.
- [ ] Documentar, commitar e entregar patch incremental.
