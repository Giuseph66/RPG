# ADR-0003 — Quatro destinos e ferramenta global

Estado: adotado no plano; exigência do briefing.

Destinos únicos: Personagem, Ações, Jornada, Compêndio. “Regras” pode ser rótulo compacto de Compêndio, nunca destino adicional. Dados é ação global elevada, disponível em todos destinos e controlada por overlay; header chama mesmo serviço.

Rotas futuras: `/` redireciona conforme estado para `/character` ou `/character/create`; `/character`, `/character/create`, `/actions`, `/journey`, `/compendium`, `/compendium/:type/:id`, `/settings`. Configurações/criação/detalhes são rotas auxiliares, não quinto item da navegação principal. Sem personagem: shell abre Criar/Importar, mantendo dados livres e consulta disponíveis quando pack carregado.

Mobile bottom navigation, tablet adaptação por espaço e desktop rail/sidebar compacta. Alterar breakpoint não duplica rota, store ou histórico. Overlay preserva retorno/foco; não recebe página independente só por facilidade de implementação.

Consequência: a ficha exibe resumo de ataque/magia e Ações executa com a mesma referência. Header fixo precisa reservar espaço e adaptar-se ao zoom. [Navegação](../interface/navegacao.md).
