# Conversa natural no assistente

Proposta híbrida aprovada pela usuária em 29/10/2026: aceitar frases completas, sinônimos de comandos, correções durante a conversa e perguntar somente dados faltantes. Manter confirmação antes de consultar e suporte a produtos e combustíveis.

Alternativas: ampliar somente regras locais evita tokens mas continua restritivo; enviar toda fala à IA aumenta latência e consumo. Escolha: regras locais para respostas simples e IA como alternativa para linguagem complexa, com opção visível de desativação.

A IA recebe texto e campos atuais da consulta, nunca coordenadas, resultados, histórico ou áudio. Correções preservam dados não alterados. Novos pedidos substituem o produto; cancelamento descarta respostas tardias. Falhas/cota permitem continuar manualmente, sem executar a consulta anterior por engano. Campos fornecidos não são perguntados novamente. Ambiguidades exigem esclarecimento, sem inventar tipo de combustível ou localização.

Sem novos provedores, dependências ou configurações de implantação. Nenhuma promessa de interpretar qualquer frase ou de cota ilimitada. Commits de Ana Ferreira, entrega por patch incremental.
