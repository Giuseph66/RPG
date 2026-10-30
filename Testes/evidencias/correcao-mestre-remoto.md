# Evidência mestre — QA remoto

Data da captura: 2026-10-05 (sessão sanitizada; nenhuma credencial registrada).

- Campanha QA nova criada pelo mestre: documento remoto respondeu HTTP 200 com `schemaVersion: 1`, revisão 3, um objetivo e uma missão.
- Mapa privado de prova: criação e listagem aninhada pelo mestre responderam HTTP 200; `visibleTo` vazio.
- Mapa público de prova: criação e listagem aninhada pelo mestre responderam HTTP 200; `visibleTo` contém `*`.
- Consulta de convite: a campanha nova ainda não tinha membro jogador no instante desta captura; compartilhamento para o jogador depende do aceite pareado.

A prova foi feita por leitura REST autenticada com credenciais QA temporárias fora deste arquivo. O resultado visual da aba mestre foi capturado pela sessão CUA; a API desta sessão não oferece caminho para persistir os bytes da imagem em `Testes/evidencias`.
