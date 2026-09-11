# Pendências da fonte e decisões necessárias

Estado inicial: abertas, salvo linha explicitamente resolvida por decisão arquitetural. Não inferir aprovação pelo tempo decorrido. Implementação de efeito ambíguo exige decisão registrada; consulta da fonte e módulos independentes podem avançar. “Não definido pela fonte atual” nunca vira valor padrão silencioso.

| ID | Evidência / referência Livro do Jogador | Impacto e encaminhamento |
| --- | --- | --- |
| PEND-001 | Patrulheiro cap.3 pp.115–122/PDF114–121 contém três Conclaves e regras particulares; base editorial exata não identificada | Identidade técnica resolvida por ADR-0005: usar compilação local. Não atribuir origem externa sem evidência; nenhuma mistura com outra edição |
| PEND-002 | Cap.1 p.15/PDF14: exemplo cota de malha+escudo resultaCA17; tabela cap.5 p.145–148/PDF144–147 define parcelas incompatíveis com exemplo | Proposta: aplicar tabela normativa, tratar exemplo como erro. Confirmar antes de automatizar cenário conflitante; não usar exemplo como fixture esperada |
| PEND-003 | Cap.1 p.15/PDF14: redação do aumento de CON menciona modificador chegando a valor par; exemplo fala score17→18 e modificador+3→+4 | Formalização proposta: mudança no modificador afeta PV por nível. Confrontar seção da classe e registrar decisão; não condicionar erroneamente à paridade do modificador |
| PEND-004 | Clérigo/Druida cap.3 usam ritual de magia que “conheça”; geral cap.10 p.204/PDF203 exige conhecida/preparada conforme fonte; círculo druida p.75/PDF74 usa “sempre poderá prepará-la” | Decidir elegibilidade ritual e efeito das magias de círculo na preparação; bloquear automatismo dessas escolhas ambíguas. Ritual do mago com regra explícita pode avançar |
| PEND-005 | Mago Assinatura Mágica cap.3 p.97/PDF96 combina uma vez ao dia com recuperação curto/longo | Definir trigger exato do recurso antes de automatizar recuperação |
| PEND-006 | Bruxo Correntes de Cárceri cap.3 p.61/PDF60 tem pré-requisito autorreferente | Pré-requisito não definido coerentemente; não liberar por circularidade nem inventar substituto |
| PEND-007 | ApêndiceD Lobo p.309/PDF308 menciona resistência de Força para derrubar sem CD | CD não definido pela fonte atual; ataque/dano podem ser modelados, derrubar exige decisão explícita da mesa |
| PEND-008 | Druida Lua nível10 autoriza formas elementais; apêndiceD não fornece todos blocos necessários | Estatísticas ausentes: não definido pela fonte atual. Documentar capacidade, não importar bestiário externo automaticamente; forma indisponível sem pack complementar autorizado |
| PEND-009 | Humano variante cap.2 p.31/PDF30 refere substituir traço “Perícias” ausente na base | Definir substituição efetiva; opção também depende da fase de talentos. Não conceder benefícios cumulativos por interpretação silenciosa |
| PEND-010 | Exemplo Criminoso cap.4 p.127/PDF126 cita venenos; bloco p.134/PDF133 fornece jogo e ferramentas de ladrão | Proposta: usar bloco do antecedente; confirmar discrepância antes de validar fixture do exemplo |
| PEND-011 | Mestre de Armas de Haste cap.6 p.170/PDF169 alterna bordão/bastão; descrição de lança de montaria cap.5 p.150/PDF149 usa nome que conflita com distinção da tabela | Mapear termos a IDs mediante decisão explícita; aliases de busca não resolvem regra de alcance/propriedade |
| PEND-012 | Cap.5 p.155/PDF154: capacidades de recipientes apresentam volumes incompatíveis com pesos (ex.: mochila) | Não calcular volume automático com unidade suspeita. Peso continua rastreável; capacidade volumétrica fica “não definido pela fonte atual” até decisão |
| PEND-013 | Combate montado cap.9 p.200/PDF199 pede resistência Destreza em situação descrita sem CD | CD não definido pela fonte atual; operação assistida com valor informado pelo mestre |
| PEND-014 | Transe élfico cap.2 p.23/PDF22 e descanso longo cap.8 p.188/PDF187 não esclarecem todas relações; recuperação de metade dos DV sem mínimo explícito | Não importar regra externa de duração/min1. Definir política para elfo e nível1 quando necessária, preservando frações/arredondamento declarado |
| PEND-015 | Reação cap.9 p.195/PDF194 usa “uma por turno”, enquanto p.192/PDF191 define recarga no próximo turno próprio | Proposta: regra específica de reação da p.192. Registrar decisão antes de automatizar bloqueio/recarga desse caso |
| PEND-016 | Distribuição pública de texto/arte dos PDFs não autorizada pelo simples fornecimento | Gate de conteúdo/publicação: escolher licença/pack e assets próprios. Não bloqueia contratos, UI nem documentação técnica |
| PEND-017 | Mago, Pedra do Transmutador, cap.3 p.100/PDF99: uma passagem atribui a troca do benefício à conjuração de magia de escola incompatível com a tradição | Confirmar a escola pretendida antes de automatizar o gatilho; criação da pedra e escolha inicial podem avançar |
| PEND-018 | Talento Imobilizador, cap.6 p.167/PDF166: uma frase deixa ambíguo quem recebe a condição no uso da ação | Modelar seleção e rolagem, mas exigir decisão da mesa para aplicar a condição e o alvo até resolução |
| PEND-019 | Talento Mestre em Armadura Média, cap.6 p.167/PDF166: introdução menciona armadura pesada, enquanto pré-requisito e benefícios tratam armadura média | Aplicar somente requisitos inequívocos após decisão registrada; não ampliar proficiência ou benefício por inferência |

## Diferenças registradas que não são correções automáticas

Recuperação Natural do Druida usa arredondamento da própria compilação; regras de Patrulheiro seguem seus Conclaves; Pedra do Transmutador menciona escola específica; recursos do Bruxo usam recuperação descrita no arquivo. Onde texto é inequívoco, documentar e testar essa mecânica. Não abrir bloqueio apenas porque memória externa sugere outra regra.

## Registro de resolução

Para cada ID: evidência adicional, decisão escolhida, responsável, data, versão do pack afetada, documentos/tarefas/testes atualizados. Regras de mesa ficam com proveniência `tableDecision`, nunca falsamente atribuídas ao livro. Se outro PDF substituir a fonte, conferir hash, recatalogar diferenças e criar migração de pack.
