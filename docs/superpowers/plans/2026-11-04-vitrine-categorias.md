# Vitrine de produtos por categoria

Objetivo: ao selecionar uma categoria, carregar registros reais sem exigir nome de produto antes. Sem local conhecido, pedir município/GPS explicitamente.

A API existente exige descrição junto do GPC. Cada categoria possui três termos iniciais, filtrados pelo GPC real na requisição e novamente na resposta. A vitrine é uma amostra; a busca por nome permite procurar outros itens.

- [x] Centralizar termos e limites; fazer até três consultas paralelas pelo caminho server-only existente.
- [x] Reutilizar cache TanStack por categoria, local completo, dias, termos e modo demo, válido por dois minutos e descartável após cinco minutos sem uso. Reaproveitar cache de cinco minutos já existente no proxy.
- [x] Pedir somente as fontes que têm próxima página, até três páginas de 50 registros por termo. Preservar vazios filtrados com cursor, deduplicar IDs e ordenar registros carregados por preço sem alegar mínimo global.
- [x] Aguardar 400 ms em alterações rápidas de local/período, evitar retentativas automáticas adicionais e manter consultas parciais quando uma fonte falha.
- [x] Mostrar data da consulta, demonstração, falha parcial, limite da vitrine e estados vazios. Reutilizar cartões/detalhes/local/período existentes.
- [x] Validar testes, tipos, lint, build e patch incremental.
