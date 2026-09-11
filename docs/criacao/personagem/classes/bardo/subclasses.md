# Bardo — 2 colégios

Fonte: Livro do Jogador fornecido, cap.3, pp.54–55/PDF53–54. Escolha nível3; marcos6/14.

## `college-of-lore` — Colégio do Conhecimento

- Nível3, Proficiência Adicional: três perícias quaisquer, mantendo origem. Palavras de Interrupção: quando criatura visível a18m realiza ataque, teste de habilidade ou dano, reação + gasto de Inspiração; rolar dado e subtrair após rolagem, antes de saber sucesso/dano aplicado. Imune se não ouvir ou se imune a encanto.
- Nível6, Segredos Mágicos Adicionais: duas magias/truques de qualquer classe, elegíveis ao nível; contam como bardo e não contam no limite de conhecidas. Cada concessão registra spellRef e fonte.
- Nível14, Habilidade Inigualável: ao fazer teste de habilidade, gastar Inspiração e somar seu próprio dado depois do d20, antes do resultado; não vale ataque/resistência.

## `college-of-valor` — Colégio da Bravura

- Nível3, Proficiência Adicional: armaduras médias, escudos e armas marciais. Inspiração em Combate amplia dado entregue: destinatário pode somá-lo ao dano de arma depois da rolagem, ou usar reação para somá-lo à CA contra um ataque depois da rolagem e antes de saber acerto; continua um dado por destinatário.
- Nível6, Ataque Extra: dois ataques na ação Atacar; não soma Ataque Extra de outra classe.
- Nível14, Magia de Batalha: após ação para conjurar magia de bardo, pode fazer um ataque com arma como ação bônus; não concede ação Atacar completa.

## Dados, UI e aceite

`BardicInspirationInstance` guarda dono, destinatário, tamanho, expiração10min, usos permitidos e consumed. Palavras de Interrupção consome diretamente pool; Inspiração em Combate altera permissões da instância. UI separa inspiração narrativa de Inspiração de Bardo.

Testes: cortar dano não aceita resistência; dado entregue não pode ser usado duas vezes; CA escolhe antes do resultado; Segredos nível6 não reduz limite; Magia de Batalha só após magia de bardo. Escolha antes do nível3 rejeita; troca exige revisar grants sem apagar magia de outra origem.
