# Estado do personagem

Autoridade: [schemas](schemas.md). Estado salva fatos e escolhas, não cópias de definitions. `CharacterDerived` reúne atributos finais, modificadores, perícias, resistências, CA, iniciativa, deslocamento, proficiência, PV máximo, recursos máximos, ataques disponíveis, fontes mágicas e explicações; descartável.

## Ciclo de vida

`draft → validated → persisted → active`. Draft incompleto não é ficha válida: permite passos vazios, tem schema próprio e lista de validações pendentes. Finalização cria Character em transação; voltar ao wizard não reutiliza criação para gerar duplicata. Personagem arquivado permanece exportável, fora do seletor padrão.

Alterar raça/classe após criação exige fluxo de revisão que lista escolhas invalidadas, impactos em PV/itens/magia e confirmação. Não apagar itens adquiridos em sessão por mudar equipamento inicial. Alterar nível não restaura slots nem recursos automaticamente; derivações e migração de escolhas são passos distintos.

## Invariantes de sessão

PV atual/temp são separados; recursos guardam spent; death saves registram estado estável e pendências; concentração referencia efeito único; transformações preservam estado original. Condições com origens distintas não se confundem. Duração em rodadas depende de avanços explícitos do tempo de jogo, não de segundos reais com a aplicação fechada.

Campos manuais têm razão e indicação visual. Em regra não definida pela fonte atual, ajuste manual só é permitido como decisão explícita da mesa e separado da regra oficial; não “consertar” automaticamente pack.

## Estado global e local

Personagem ativo é ID persistido como preferência pequena, validado ao abrir; ID removido gera seletor vazio. Snapshot do personagem é observado por partes, via store do agregado. Navegar não duplica objeto durável. Overlay/drawer/filtro são UI; forms mantêm dirty state; favoritos e notas são dados persistentes.

Aceite: reload reconstrói mesmos derivados com pack fixado; mudança de idioma não altera ID; dois comandos simultâneos não perdem recursos; cancelar revisão mantém snapshot anterior.
