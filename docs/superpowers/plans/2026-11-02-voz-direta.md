# Busca por voz direta — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** Buscar ao compreender o pedido completo, sem exigir frase exata.
**Architecture:** Conclusão compartilhada de rascunho, busca automática opcional, alternativa de IA para toda fala não reconhecida e esclarecimento bloqueante.
**Tech Stack:** React, TypeScript, Zod, Vitest.
**Spec:** docs/superpowers/specs/2026-11-02-voz-direta-design.md

## Global Constraints
- Preservar APIs, filtros, dados locais e deploy.
- Não inventar local; GPS só por pedido explícito.
- Não executar retorno ambíguo, inválido ou tardio.

## Review Focus
- GPS negado não executa consulta no local anterior.
- “Sim” após esclarecimento não executa intenção incompleta.
- Correção não herda filtros incompatíveis de outro produto.
- Uma frase não dispara duas consultas.
- Falha de IA não reexecuta o pedido anterior.

### Task 1
- [x] Testar pesquisa automática, cidade faltante, fala não prefixada, correção e cancelamento.
- [x] Implementar conclusão automática, perguntas específicas e fallback em qualquer etapa.
- [x] Manter confirmação opcional e atualizar interface, textos e documentação.
- [x] Executar testes, tipos, lint e build, revisar e corrigir regressões.
- [x] Registrar commits de Ana Ferreira e entregar patch incremental desde f0c4969.

## Registro

155 testes verdes; tipos, lint direcionado e build aprovados. Testes de regressão anteriores explicitam o modo manual; novos testes cobrem padrão automático, falta de município, correções, perguntas ambíguas, GPS negado, cancelamento, mais de cinco interpretações e falha do provedor. Revisão independente indisponível por limite de uso, substituída por revisão própria, sem alegar segunda revisão. Feedback adicional da usuária aplicado à navegação: destaque exclusivo da aba ativa. Chat e marca regional ainda não implementados.
