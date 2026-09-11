# Progressão de personagem

Fonte: **Livro do Jogador fornecido**, capítulo1,p15/PDF14; multiclasse cap6,p165–167/PDF164–166. Nível total e nível de classe são campos distintos. A tabela abaixo é a fonte de XP/PB, não uma curva inventada.

| Nível total | XP mínimo acumulado | PB |
|---:|---:|---:|
|1|0|2|
|2|300|2|
|3|900|2|
|4|2700|2|
|5|6500|3|
|6|14000|3|
|7|23000|3|
|8|34000|3|
|9|48000|4|
|10|64000|4|
|11|85000|4|
|12|100000|4|
|13|120000|5|
|14|140000|5|
|15|165000|5|
|16|195000|5|
|17|225000|6|
|18|265000|6|
|19|305000|6|
|20|355000|6|

## Derivação e atualização

Para níveis1–20,PB=`2+floor((nível−1)/4)`. XP acumulado não é reiniciado ao subir nível. Progresso entre níveis=`(XP−limiarAtual)/(limiarPróximo−limiarAtual)`, limitado visualmente a0–1; em20 não há próximo limiar, mostrar máximo sem divisão porzero.

Receber XP pode tornar personagem elegível para vários níveis, mas não escolhe classe/subclasse/talento/magias pelo jogador. Wizard de progressão aplica um nível por vez: classe → PV/dado → características → escolhas → prévia → confirmar. Milestone pode ser registro manual de nível autorizado pela campanha, sem alegar tabela de XP diferente na fonte.

Primeiro nível usa dado máximo da classe+CON; posteriores dado rolado ou valor fixo indicado pela classe+CON. Guardar método e resultado-base por nível. Aumento do modificador CON vale retroativamente; traços raciais/talento Robusto acrescentam por nível total. Incrementos de Habilidade e subclasses seguem nível na classe, não total; Ataque Extra e slots usam respectivas regras.

## Contrato e casos especiais

`LevelAdvancement` conceitual registra nível total alvo, classe, dado/método, escolhas de características e origens; tabelas de classe estáticas ficam no catálogo. Prévia inclui máximo PV, PB, perícias, ataques, CDs, magias, recursos e pendências de seleção. Importação preserva escolha histórica em vez de recriar rolagens.

Texto de exemplo Bruenor,p15, possui CA divergente da tabela de equipamento; não usar exemplo para fórmula. A menção ao “modificador de Constituição par” deve ser interpretada com tabela específica de modificadores,p175,e regra retroativa,p179. Pendências centralizam divergências.

## Testes e aceite futuro

XP6499→limiar nível4;6500→elegível nível5/PB3. Nível20→PB6 e sem limiar21. Guerreiro3/ladino2→nível5/PB3 sem benefícios de guerreiro5. CON+1 no modificador em nível6→máximo+6. Cancelar prévia deixa personagem original; confirmar nível duas vezes rejeita pelo mesmo ID/revisão. [Multiclasse](../regras/multiclasses.md), [classes](classes/README.md).
