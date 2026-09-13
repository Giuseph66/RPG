# 01 — Visão do produto

RPG Companion acompanha um jogador durante uma sessão presencial. Prioridade: consultar a ficha, executar uma ação, registrar sua consequência e continuar jogando, inclusive sem rede. O mestre continua decidindo situações ficcionais e informações que o dispositivo não conhece.

## Experiência principal

| Destino | Pergunta respondida | Conteúdo e ação prioritária |
| --- | --- | --- |
| Personagem | Quem sou? | Ficha, vida, atributos, recursos, inventário e progressão |
| Ações | O que posso fazer agora? | Ataques, magias, características, itens, concentração e descanso |
| Jornada | Onde estamos e o que aconteceu? | Campanha, mapa local, locais, NPCs, missões e diário |
| Compêndio | Como funciona? | Busca por nome, categoria e tags; regras e favoritos |

Dados é uma ação global, acessível pelo botão elevado e pelo controle do header. Não é um quinto destino. Header fixo mantém identidade, vida e recurso prioritário visíveis; informação secundária expande sob demanda. [Wireframes](04-WIREFRAMES.md).

## Sessão de referência

1. Abrir personagem salvo sem rede; reconhecer versão do ruleset e estado recuperado.
2. Tocar uma perícia; conferir modificador e suas origens; rolar e consultar valores individuais.
3. Em Ações, escolher magia e fonte de conjuração, validar componentes, escolher espaço e confirmar consumo.
4. Receber dano, atualizar a camada correta de PV, resolver teste de concentração quando aplicável.
5. Registrar descoberta num marcador do mapa e numa nota da sessão.
6. Exportar campanha com personagens e imagens; restaurar em outro perfil do navegador.

## Resultado observável

Nenhum cálculo fundamental depende de texto exibido, rede ou componente React. Operações sobre recursos são atômicas e explicáveis. O usuário distingue claramente estado salvo, alteração pendente e falha de gravação. Importação nunca substitui silenciosamente trabalho existente.

Direção visual: dark fantasy natural, com carvão, pedra, madeira, metal envelhecido e vegetação. Software legível, sem transformar toda a interface em pergaminho. [Design system](05-DESIGN-SYSTEM.md).

## Fontes e limites

Requisitos de produto: briefing fornecido. Mecânicas: [Livro do Jogador](../Livro%20do%20Jogador.pdf), edição vinculada ao arquivo, não ao nome comercial presumido. Organização da ficha: [PDF de três páginas](../Ficha%20de%20Personagem%20em%20branco.pdf). Dados da campanha funcionam localmente sem rede. Quando o usuário optar por uma conta, Firebase Authentication, Firestore e Cloud Storage fornecem sincronização assíncrona e relações entre mestre e jogadores; IndexedDB continua sendo a escrita imediata e o caminho operacional offline. A capacidade remota é opcional e só será anunciada após configuração e validação de segurança.
