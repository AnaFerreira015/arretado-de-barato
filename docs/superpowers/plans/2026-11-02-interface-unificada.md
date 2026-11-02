# Interface unificada — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** Atualizar identidade visual e consolidar busca.
**Architecture:** Rota principal com modo validado na URL e painéis especializados; controles comuns de localização/período e tipo; redirecionamento legado.
**Tech Stack:** React, TanStack Router, Tailwind, Vitest.
**Spec:** docs/superpowers/specs/2026-11-02-interface-unificada-design.md

## Global Constraints
- Preservar API, credenciais, deploy e dados locais.
- Sem pesquisa automática na troca de tipo; manter favoritos pendentes.
- Respeitar teclado, contraste, movimento reduzido e telas pequenas.

## Review Focus
- Troca de tipo durante consulta não mistura resultados.
- Favorito de combustível abre o tipo correto com seus filtros.
- Link antigo redireciona sem perder o modo.
- Voz recebe o tipo atual e não grava automaticamente.
- Filtros de favoritos não apagam registros nem deixam estado vazio sem explicação.

### Task 1: Consolidar busca
- [ ] Testar modo, preservação de filtros e cancelamento antes de implementar.
- [ ] Extrair painéis das rotas e controles compartilhados; redirecionar combustível.
- [ ] Atualizar favoritos/retorno da voz e testar fluxo.
- [ ] Commit com autoria da usuária.

### Task 2: Identidade visual e navegação
- [ ] Aplicar tokens, hero, acesso de voz destacado e navegação móvel.
- [ ] Testar filtros de favoritos e navegação acessível.
- [ ] Executar suite, tipos, build, revisão e verificação visual se navegador disponível.
- [ ] Commit e patch incremental desde 3d3953d.
