# Header fixo de sessão

## Conteúdo

Mobile: linha 1 nome + classe + nível; linha 2 PV atual/máximo, PV temporários quando >0, recurso primário e CA. Classes múltiplas usam resumo acessível com expansão. Recurso primário depende de configuração/capacidade da classe, não string de nome ou índice. XP, iniciativa, deslocamento, proficiência, slots e condições extras ficam em expansão por botão nomeado. Desktop pode mostrar XP e iniciativa mais dados rápidos se houver espaço; não sacrificar rótulos.

Altura recomendada na escala padrão: mobile 88–104 CSS px, máximo 112; desktop 64–88, máximo 96. Texto ampliado pode exceder limite: priorizar reflow, conteúdo completo e foco. Header em fluxo é fallback em viewport baixa/zoom que impedir leitura. O conteúdo reserva altura calculada; nenhuma constante fixa deve ocultar título ou alvo de foco.

## Interações

PV abre ajuste com abas dano/cura/temporários, quantidade e resumo do efeito; comando do domínio resolve mecânica. Recurso abre painel com usos/restauração/fonte, não incrementa livremente sem contexto. CA/iniciativa abrem decomposição do valor e ação de rolagem cabível. Nome abre seletor de personagem, guardando ou descartando draft via superfície própria. Concentração e condição abrem detalhes. Header rápido `[quantidade] [dado] [Rolar]` envia ao mesmo serviço de dados; mobile abre DiceOverlay pré-preenchido.

## Estados

| Estado | Representação e ação |
| --- | --- |
| Normal | PV numéricos/barra e recurso legível. |
| PV baixo | Ícone/rotulo de alerta e cor sem piscada; limiar é preferência de UX. |
| 0 PV | Destaque textual e atalho aos testes contra morte conforme estado do domínio. |
| Concentração | Chip com efeito e acesso a encerrar/substituir. |
| Condição ativa | Nome mais relevante e contador expansível, sem esconder efeitos. |
| Recurso esgotado | “0/N” e “Como recuperar”; ação inválida informa razão. |
| Salvando/erro | Indicador discreto / aviso persistente; “Salvo” só após confirmação do repository. |
| Nenhum personagem | Título do app + Criar/Importar; sem estatísticas inventadas. |

Fontes de mecânica: [dano/cura](../regras/dano-e-cura.md), [morte](../regras/morte.md), [concentração](../magia/concentracao.md). Ficha fornecida PDF p.1 determina destaque de PV, CA, iniciativa, deslocamento e dados de vida.
