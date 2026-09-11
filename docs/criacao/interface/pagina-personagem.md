# Personagem — ficha rápida e expandida

## Correspondência com a ficha fornecida

| Fonte | Campos observados | Destino visual |
| --- | --- | --- |
| Ficha PDF p.1 | Nome, classe/nível, raça, antecedente, jogador, tendência, XP. | Header/resumo e identidade expandida. |
| Ficha PDF p.1 | Seis atributos, inspiração, proficiência, seis resistências, dezoito perícias, percepção passiva. | Matriz de atributos e listas acionáveis com decomposição. |
| Ficha PDF p.1 | CA, iniciativa, deslocamento, PV totais/atuais/temporários, dados de vida, morte. | Estado rápido e painel de sessão. |
| Ficha PDF p.1 | Ataques/magias, equipamentos, moedas, idiomas/proficiências, características. | Resumo aqui; executar ataques/magias em Ações; inventário como subárea. |
| Ficha PDF p.1 | Traços, ideais, ligações e defeitos. | Identidade/narrativa expandida. |
| Ficha PDF p.2 | Idade, altura, peso, aparência, olhos, pele, cabelos, história, aliados/organizações, símbolo, tesouro. | Identidade e história; relações opcionais com Jornada. |
| Ficha PDF p.3 | Classe conjuradora, habilidade-chave, CD, ataque mágico, truques, magias por nível, preparadas, espaços totais/usados. | Resumo mágico aqui; gerenciamento e conjuração em Ações. |

A ficha está vazia: não inferir personagem Thorin ou valores reais. A ficha orienta representação; livro determina regras. Traduções como “Blefar” são labels preserváveis/aliases, nunca IDs.

## Visão rápida

Exibe PV/defesas, atributos/modificadores, condições, concentração, recurso primário e atalhos para perícias/resistências/inventário. Cada bônus abre explicação: valor base + proficiência/expertise + modificadores aplicáveis e fonte. Rolar atributo, perícia, resistência ou iniciativa usa intenção tipada e modo elegível. Ajustar vida e remover condição são comandos, sem gravação direta em componente.

## Visão expandida

Seções identidade, atributos/perícias, defesas/recursos, características, inventário, progressão e narrativa. Estado da expansão/aba é UI transitória; dados editáveis são draft local até validação. Raça, sub-raça, classe, subclasse e antecedente apontam para definições do pack, mantendo escolhas e usos na ficha. Equipamento ativo é instância de inventário, não definição alterada. Proficiências e idiomas exibem origem e duplicidades resolvidas pelo domínio.

## Fluxos e estados

Primeiro acesso oferece criar/importar, sem stats placeholder editáveis. Criação usa wizard com revisão; ficha incompleta apresenta escolhas pendentes e bloqueia apenas ações dependentes. Progressão mostra XP/nível e escolhas exigidas, sem conceder automaticamente capacidades ambíguas. Descanso abre prévia em Ações. Morte/estabilização são estados explícitos com referência de regra. Corrupção/missing pack mantém exportação e diagnóstico. Testar equivalência de dados entre visão rápida e expandida, restauração após recarga e troca de personagem durante formulário. Tasks: CHAR-002, CHAR-003, CHAR-004 e UI-004.
