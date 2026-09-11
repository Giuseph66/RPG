# Multiclasse

Fonte: **Livro do Jogador fornecido**, capítulo6,p165–167/PDF164–166. Opção exige disponibilidade da campanha. Estado guarda níveis por classe e ordem das escolhas; nível total é soma, não maior nível entre classes.

## Elegibilidade e proficiências adquiridas

P165–166/PDF164–165. Ao entrar em nova classe, atender requisito da classe atual e da nova; em combinação existente validar os requisitos envolvidos. Ganhar equipamento inicial e PV máximos do primeiro dado **somente no primeiro nível total**. Nova classe concede apenas a coluna abaixo, não resistências/proficiências iniciais completas. Características de classe podem conceder outras proficiências explicitamente.

| Classe | Requisito | Proficiências ao adicionar classe |
|---|---|---|
| Bárbaro |FOR13|Escudos, armas simples/marciais|
| Bardo |CAR13|Leves,1 perícia qualquer,1 instrumento|
| Bruxo |CAR13|Leves,armas simples|
| Clérigo |SAB13|Leves/médias/escudos|
| Druida |SAB13|Leves/médias/escudos;restrição de metal da classe|
| Feiticeiro |CAR13|Nenhuma|
| Guerreiro |FOR13 OU DES13|Leves/médias/escudos,armas simples/marciais|
| Ladino |DES13|Leves,1 perícia da lista, ferramentas de ladrão|
| Mago |INT13|Nenhuma|
| Monge |DES13 E SAB13|Armas simples/espadas curtas|
| Paladino |FOR13 E CAR13|Leves/médias/escudos,armas simples/marciais|
| Patrulheiro |DES13 E SAB13|Leves/médias/escudos,armas simples/marciais,1 perícia da lista|

## Progressão e características compartilhadas

XP e PB dependem do nível total. Características, escolha de subclasse e Incrementos de Habilidade dependem do nível na classe. Dados de Vida adicionados conforme classe; agrupar tipos iguais e manter pools diferentes para tipos distintos. PV de classe adicionada usa regra de níveis posteriores, sem novo dado máximo inicial.

Canalizar Divindade: compartilhar usos; opções de ambas as classes, sem somar usos só por adquirir duas vezes. Usos adicionais somente pelo nível que explicitamente os concede; clérigo6/paladino4 tem2 usos e pode escolher opções de ambas.

Ataque Extra não acumula; versão guerreiro pode permitir quantidade maior. Lâmina Sedenta não acrescenta ataques se já tem Ataque Extra. Defesa sem Armadura já possuída não pode ser adquirida da segunda classe; não escolher/fundir fórmulas como se ambas tivessem sido concedidas.

## Conhecidas, preparadas e slots

P166–167/PDF165–166. Conhecidas e preparação calculadas **por classe individualmente**, atributo e foco conservam classe de origem. Truques escalonáveis usam nível total. Slots superiores não permitem aprender/preparar magia superior à elegibilidade da classe; servem para elevar magias conhecidas quando seus efeitos preveem isso.

Só usar tabela multiclasse quando possui Conjuração de mais de uma classe. Níveis efetivos: somar níveis completos de bardo/clérigo/druida/feiticeiro/mago; contribuição inteira por classe `floor(paladino/2)` e `floor(patrulheiro/2)`; `floor(guerreiro/3)` somente Cavaleiro Arcano e `floor(ladino/3)` somente Trapaceiro Arcano. Nível de classe sem característica Conjuração não cria contribuição habilitada. Composições de vários meios/terços ímpares exigem política de arredondamento registrada, pois a fonte não dá exemplo desse caso; a proposta é arredondar cada contribuição por classe.

Bruxo/Magia de Pacto não entra na soma; mantém pool próprio, nível dos slots e recuperação próprios. Slots de Pacto podem conjurar conhecidas/preparadas da outra classe; slots de Conjuração podem conjurar conhecidas de bruxo. Consumir o pool escolhido, nunca os dois. Arcanum Místico continua recurso separado. Compilação contém divergências na classe bruxo; consultar ficha da classe e pendências antes de resolver capacidade desse pool.

## Tabela de slots por nível efetivo

Fonte:p167/PDF166. Zero indica ausência, não slot consumido.

| Nível |1º|2º|3º|4º|5º|6º|7º|8º|9º|
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|1|2|0|0|0|0|0|0|0|0|
|2|3|0|0|0|0|0|0|0|0|
|3|4|2|0|0|0|0|0|0|0|
|4|4|3|0|0|0|0|0|0|0|
|5|4|3|2|0|0|0|0|0|0|
|6|4|3|3|0|0|0|0|0|0|
|7|4|3|3|1|0|0|0|0|0|
|8|4|3|3|2|0|0|0|0|0|
|9|4|3|3|3|1|0|0|0|0|
|10|4|3|3|3|2|0|0|0|0|
|11|4|3|3|3|2|1|0|0|0|
|12|4|3|3|3|2|1|0|0|0|
|13|4|3|3|3|2|1|1|0|0|
|14|4|3|3|3|2|1|1|0|0|
|15|4|3|3|3|2|1|1|1|0|
|16|4|3|3|3|2|1|1|1|0|
|17|4|3|3|3|2|1|1|1|1|
|18|4|3|3|3|3|1|1|1|1|
|19|4|3|3|3|3|2|1|1|1|
|20|4|3|3|3|3|2|2|1|1|

## Contrato, fluxo e testes futuros

Registrar `classLevels`, progressão ordenada, concessões com origem, pools e escolhas de slots; derivar PB e nível efetivo, sem persistir cópia divergente das tabelas. Subir nível → validar requisitos → escolher classe/subclasse/benefícios → conferir magias e recursos → confirmar transação.

Patrulheiro4/mago3:nível total7/PB3, nível efetivo5→slots4/3/2; não conhece magia de3º por isso. Guerreiro3/ladino2→PB3, sem Ataque Extra. Guerreiro5/paladino5→2 ataques, não3. Mago1 adicionado ao guerreiro não concede proficiências em resistências INT/SAB. Clérigo6/paladino4→2 usos de Canalizar. Dois pools que possuem slots de1º permitem seleção explícita e históricos distintos.

[Slots](../magia/slots.md), [progressão](../personagem/progressao.md), [classes](../personagem/classes/README.md), [pendências](../decisoes/PENDENCIAS.md).
