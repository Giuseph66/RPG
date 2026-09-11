# Navegação e rotas

## Quatro destinos, uma ação global

| Destino | Rota conceitual | Pergunta respondida |
| --- | --- | --- |
| Personagem | `/character` | Quem sou e qual meu estado? |
| Ações | `/actions` | O que posso usar agora? |
| Jornada | `/journey` | Onde estamos e o que aconteceu? |
| Compêndio | `/compendium` | Como funciona? |

“Regras” é alias visual compacto para Compêndio, mesmo link e identidade. Dados é button global, elevado no mobile; nenhuma rota `/dice` é destino principal. Desktop/rail preservam os quatro destinos. React Router planejado para rotas; dependência só na implementação autorizada.

## Rotas subordinadas e utilitárias

`/` resolve para personagem ativo ou onboarding. `/character/create`, `/character/:id` e subáreas de ficha mantêm Personagem ativo; `/compendium/:type/:id` mantém Compêndio. `/journey` pode selecionar mapa/registro por parâmetro estável; não representar estado interno de cada widget em URL. `/settings` é utilitária pelo menu; não quinto destino. Overlay de dados não necessita rota; botão voltar fecha overlay antes de perder contexto quando integração de histórico for adotada, com comportamento único documentado/testado.

## Histórico e guardas

Abrir detalhe de regra usa rota navegável e conserva busca/filtros/scroll no retorno. Trocar destino não reinicia formulário sem aviso. Falta de personagem bloqueia só ações que precisam dele, com Criar/Importar; Compêndio e dados avulsos continuam disponíveis. Link desconhecido oferece retorno seguro, sem tela branca. Rota profunda deve abrir offline após instalação do shell. Seleção atual usa `aria-current`; item da navegação continua com label visível. Mudança de rota move foco ao título principal, salvo retorno que restaura origem conhecida.
