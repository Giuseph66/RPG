# Dados — ferramenta global

## Superfície e componentes

FAB elevado, header rápido e links de rolagem contextual abrem um OverlayHost. Desktop usa DiceModal; mobile usa BottomSheet com mesmo conteúdo DiceOverlay. Componentes previstos: DiceSelector, DiceQuantitySelector, DiceModifierSelector, DiceResult e DiceHistory. Engine independente em [11-DICE-ENGINE](../11-DICE-ENGINE.md). Nenhum componente chama RNG diretamente.

## Fluxo

Abrir → receber expressão/contexto inicial → ajustar quantidade, faces e modificador → escolher modo elegível → validar → rolar → mostrar resultado → gravar registro local → permitir nova rolagem. Dados suportados d4/d6/d8/d10/d12/d20/d100. Seletor de quantidade aceita inteiro positivo dentro do limite contratual; modificador aceita sinal; expressão inválida produz erro inline sem sortear parcialmente. Modo normal/advantage/disadvantage segue contrato; não aplicar vantagem indiscriminadamente a 2d6 de dano.

Exemplo de apresentação: `3d6 + 2`, faces `[4] [6] [2]`, subtotal `12`, modificador `+2`, total `14`. Teste com vantagem mostra ambos d20 e identifica descartado. D20 natural é identificado quando relevante; não significa sucesso automático em toda perícia. Resultado contextual mostra origem do bônus e capacidade, sem inferir alvo desconhecido.

## Histórico e comando

Registro inclui ID de rolagem, timestamp, expressão, faces, parcelas/seleção, total e contexto opcional de personagem/ação. RNG é controlável em testes; histórico não deve ser mecanismo para alterar snapshot arbitrariamente. “Rolar novamente” cria nova entrada com novo ID. Reabrir último resultado não consome de novo recurso. Histórico local tem política de retenção documentada pela persistência e pode ser exportado quando incluído no contrato; exclusão usa ConfirmModal próprio.

## Foco e desempenho

Focus inicial no título/primeiro controle conforme contexto; Escape/fechar devolvem ao acionador. Página atrás fica inerte. Resultado anunciado uma vez; animação é decorativa e removível por reduced motion. Interação permanece possível sem WebGL/modelos 3D. Tela estreita conserva rolar/fechar visíveis com teclado aberto. Fechar antes da persistência não perde registro já confirmado; falha de histórico é informada sem falsificar resultado obtido. Aceite futuro: FAB em quatro destinos, header e ação contextual produzem o mesmo formato por serviço único. Tasks DICE-001 e DICE-002.
