# 04 — Wireframes e prioridades de sessão

Estado: especificação; nenhuma tela implementada. Valores de personagem abaixo são dados ilustrativos de layout, sem constituir ficha válida, progressão ou regra. Os campos da ficha fornecida, páginas PDF 1–3, orientam agrupamento; mecânica vem do livro e de [Rules Engine](10-RULES-ENGINE.md).

## Estrutura invariável

Quatro destinos: Personagem, Ações, Jornada, Compêndio. “Regras” é apenas rótulo compacto de Compêndio. Dados é ação global que abre overlay, nunca quinto destino. Header fixo compartilha personagem ativo e seletores derivados; bottom navigation no mobile, rail no tablet, sidebar compacta no desktop. Rotas, seleção e histórico são os mesmos em todos os tamanhos.

## Mobile — Personagem / visão rápida

```text
┌──────────────────────────────────────────┐
│ THORIN       Druida · Nível 5       [⋯]  │
│ PV 31/38 +0 temp  Recurso 1/2   CA 15    │ ← header fixo
├──────────────────────────────────────────┤
│ Personagem     [Rápida] [Ficha completa] │
│ Iniciativa +2   Desloc. …   Prof. …      │
│ [Alterar vida] [Condição] [Descansar]     │
│ Concentração: —                         │
│ FOR +1    DES +2    CON +2               │
│ INT +0    SAB +3    CAR −1               │
│ [Perícias e resistências ▸]              │
│ Recursos: 1/2       [Ver recursos ▸]     │
│ [Equipamento] [Progressão]              │
│ Última gravação: salva neste aparelho   │
│                     ╭────╮              │
├─────────────────────│ 🎲 │──────────────┤
│ Personagem   Ações   ╰────╯ Jornada Regras│
└──────────────────────────────────────────┘
```

Vida: um toque abre ajuste; segundo confirma valor. Perícia expandida: um toque na linha abre rolagem contextual com bônus explicado. Mudanças de vida/recursos só entram no agregado após comando validado. Inventário e progressão são subáreas, preservando destino Personagem. A barra inferior reserva espaço real para FAB e safe area; último controle nunca fica encoberto.

## Mobile — Ações e conjuração

```text
┌──────────────────────────────────────────┐
│ THORIN · Druida · N5                 [⋯]│
│ PV 31/38   Recurso 1/2   CA 15          │
├──────────────────────────────────────────┤
│ Ações               [Buscar ação]       │
│ [Todas] [Ação] [Bônus] [Reação]          │
│ Concentração: efeito ativo [Detalhes]    │
│ ATAQUES                                 │
│ Bordão     +…    … contundente           │
│ [Rolar ataque] [Rolar dano] [Regra]       │
│ MAGIAS       [Truques] [Níveis]          │
│ Nome da magia         [Ver] [Conjurar]  │
│ RECURSOS       Restante …/…              │
│ Habilidade             [Usar] [Detalhes]│
│ [Descanso curto] [Descanso longo]        │
└──────────────────────────────────────────┘

┌──────── BottomSheet Conjurar ────────────┐
│ Nome da magia                      [×]  │
│ Classe de origem: …                     │
│ Nível do espaço [1 ▾]  disponível …/…   │
│ Componentes: …    Concentração: sim     │
│ Efeito atual será encerrado: …          │
│ [Cancelar]              [Conjurar]      │
│ Erro inline: espaço indisponível         │
└──────────────────────────────────────────┘
```

Lista não presume que toda entrada tenha ataque/dano. Cartão recebe capacidades do domínio. Conjuração apresenta origem, slot e substituição de concentração antes de um único comando. Cancelar não consome nada. Confirmação não pede slot para truque. Requisito ainda sem regra validada aparece “não definido pela fonte atual”, com ação mecânica indisponível e referência à pendência.

## Mobile — Jornada, Compêndio e Dados

```text
JORNADA                          COMPÊNDIO
┌──────────────────────────┐     ┌──────────────────────────┐
│ [Mapa] [Diário] [Missões] │     │ Buscar nome, categoria… │
│ [+ mapa] [Camadas]       │     │ [Todos] [Favoritos]      │
│ ┌──────────────────────┐ │     │ [Categoria ▾] [Tags ▾]  │
│ │       ✚ pin          │ │     │ CONDIÇÃO                 │
│ │   imagem local       │ │     │ Nome · resumo mecânico  │
│ │                [+]   │ │     │ [Consultar] [☆]         │
│ └──────────────────────┘ │     │ CLASSE                   │
│ [−] [100%] [+] [Ajustar] │     │ Nome · fonte/capítulo    │
│ Lista de locais         │     │ [Consultar] [☆]         │
│ Taverna       [Abrir]    │     │ Sem resultado? Limpar    │
└──────────────────────────┘     └──────────────────────────┘

┌────────── DiceOverlay ───────────────────┐
│ Dados                             [×]  │
│ Quantidade [−] 3 [+]   Tipo [d6 ▾]      │
│ Modificador [−] 2 [+]                    │
│ Modo: Normal                            │
│ [Rolar 3d6 + 2]                         │
│ Resultado: [4] [6] [2]                  │
│ 12 + 2 = 14                             │
│ [Rolar novamente]     [Histórico]       │
│ Hoje … · 3d6+2 · total 14               │
└──────────────────────────────────────────┘
```

Resultado informa faces individuais, parcelas e total. Vantagem/desvantagem só aparecem habilitadas para teste elegível, conforme contrato do Dice Engine. Re-rolar cria novo registro; não sobrescreve resultado anterior. Fechar devolve foco ao botão que abriu. Sheet não permite interagir com página coberta. Rolagem avulsa não altera vida nem slots automaticamente.

## Tablet — rail e painel de contexto

```text
┌───────────────────────────────────────────────────────────┐
│ Nome · Classe · Nível  PV …  Recurso …  CA …  [🎲 Dados]  │
├─────────┬───────────────────────────────┬─────────────────┤
│ Person. │ Ações                         │ Detalhes        │
│ Ações ● │ Filtros / busca               │ Regra / fonte   │
│ Jornada │ Lista de ataques              │ Custos          │
│ Regras  │ Lista de magias               │ Efeitos         │
│         │ Lista de recursos             │ [Usar]          │
│ [🎲]    │                               │                 │
└─────────┴───────────────────────────────┴─────────────────┘
```

Painel lateral só existe quando texto e alvos continuam legíveis; caso contrário usa sheet, sem rota nova. Paisagem com pouca altura reduz header; não oculta ações.

## Desktop — ficha expandida

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Nome · Classe · Nv.  PV …/… [+temp] XP … Recurso … CA … Init … [1][d20][🎲]│
├───────────┬───────────────────────────────────────────┬────────────────────┤
│ Personagem│ Ficha          [Rápida] [Expandida]        │ Sessão             │
│ Ações     │ ┌────────────┬─────────────┬─────────────┐ │ Condições          │
│ Jornada   │ │ Atributos  │ Perícias    │ Resistências│ │ Concentração       │
│ Compêndio │ │ e bônus    │ rolagens    │ rolagens    │ │ Recursos           │
│           │ └────────────┴─────────────┴─────────────┘ │ Dados de vida      │
│ [🎲 Dados]│ [Características] [Inventário] [História] │ Descanso           │
│           │ Nome | qtd | equipado | peso | ações     │ Fonte do cálculo   │
│ [Ajustes] │                                           │ [Abrir regra]      │
└───────────┴───────────────────────────────────────────┴────────────────────┘
```

Ajustes é rota utilitária fora da lista dos quatro destinos, acessível por menu; não se torna quinto item principal. Linha de dados rápidos e FAB/atalho abrem a mesma experiência e usam a mesma engine. Cabeçalho nunca executa RNG próprio.

## Estados críticos

```text
PV baixo:   [! PV 4/38] [Ajustar]         texto/ícone além da cor
PV zero:    [PV 0] [Testes contra morte]  [Estabilizado: não]
Condição:   [Impedido: …] [Ver efeitos]   explica sem truncar fonte
Sem recurso:[Recurso 0/2] [Como recuperar] ação bloqueada com motivo
Sem ficha:  [Criar personagem] [Importar] header não inventa valores
Falha salvar:[Alterações não salvas] [Tentar novamente] [Exportar]
Conflito:   [Outra aba alterou esta ficha] [Comparar/recarregar]
Offline:    [Disponível offline] estado discreto, não impede uso
```

PV baixo é alerta de interface configurável, não condição da regra. PV zero abre estado do domínio; não presume automaticamente morte. Imagens opcionais e identidade física da ficha ficam na visão expandida. Referências: [Header](interface/header.md), [Acessibilidade](13-ACESSIBILIDADE.md), [Estados](interface/estados-visuais.md).
