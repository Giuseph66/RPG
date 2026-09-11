# Estilos de luta

Contrato comum às classes que concedem Estilo de Luta. Fonte: Livro do Jogador fornecido, capítulos 3 e 6; cada concessão mantém sua `sourceRef` de classe ou talento.

| ID | Estilo | Regra normalizada | Contexto exigido |
|---|---|---|---|
| `archery` | Arquearia | `+2` nas jogadas de ataque com armas à distância | ataque e arma equipada |
| `defense` | Defesa | `+1` na CA enquanto usa armadura | armadura vestida |
| `dueling` | Duelismo | `+2` no dano com arma corpo a corpo em uma mão e nenhuma outra arma | mãos e arma no momento do dano |
| `great-weapon-fighting` | Luta com Armas Grandes | rerrola `1` ou `2` no dado de dano elegível e conserva o novo resultado | ataque com duas mãos/versátil e dados da arma |
| `protection` | Proteção | reação impõe desvantagem ao ataque contra outro alvo próximo | escudo, distância, atacante visível e reação |
| `two-weapon-fighting` | Combate com Duas Armas | soma modificador de atributo ao dano do ataque da segunda arma | ação bônus e armas elegíveis |

## Modelo

`FightingStyleDefinition` contém `id`, `nameKey`, `eligibility`, `effectSpec` e `sourceRefs`. A escolha persistida guarda apenas `definitionRef` e origem. Contexto de ataque, armadura e mãos pertence ao estado atual; bônus calculados não são persistidos.

Uma mesma personagem não escolhe o mesmo estilo mais de uma vez, salvo regra explícita. Adquirir estilo por multiclasse valida as opções autorizadas por aquela classe. Trocar arma ou escudo recalcula os efeitos sem alterar a escolha.

## Casos de prova

- Arquearia não aumenta dano nem ataque com arma arremessada que não seja tratada como arma à distância pela regra aplicável.
- Defesa cessa ao remover a armadura; escudo sozinho não satisfaz o requisito.
- Duelismo falha quando a outra mão empunha arma, mas admite escudo.
- Luta com Armas Grandes registra os dados originais e rerrolados e não rerrola o novo resultado.
- Proteção não gasta reação se a seleção for cancelada; após confirmação, gasta mesmo que a desvantagem não mude o resultado.
- Combate com Duas Armas afeta apenas o modificador de dano do ataque concedido pela regra.

