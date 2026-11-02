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
- [x] Testar modo, preservação de filtros e cancelamento antes de implementar.
- [x] Extrair painéis das rotas e controles compartilhados; redirecionar combustível.
- [x] Atualizar favoritos/retorno da voz e testar fluxo.
- [x] Commit com autoria da usuária.

### Task 2: Identidade visual e navegação
- [x] Aplicar tokens, hero, acesso de voz destacado e navegação móvel.
- [x] Testar filtros de favoritos e navegação acessível.
- [x] Executar suite, tipos, build, revisão e verificação visual se navegador disponível.
- [x] Commit e patch incremental desde 3d3953d.

## Registro da execução

Task 1: 4da3f26. Task 2: tema compartilhado, navegação, favoritos e testes de integração. Suite final 143 testes; typecheck, lint direcionado, build e smoke HTTP aprovados. Revisão independente identificou que paginação com zero correspondências poderia voltar a idle após troca de painel; regressão reproduzida antes da correção e suite verde depois. Contraste dos principais textos calculado >= 4,5:1. Navegador indisponível após falha do download; validação visual real explicitamente pendente. Sem alterações de provedor/deploy ou push. Patch base 3d3953d.
